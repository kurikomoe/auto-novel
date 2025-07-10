{
  description = "AutoNovel Nix DevEnv";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";

    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

    devenv = {
      url = "github:cachix/devenv";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    nixpkgs-python = {
      url = "github:cachix/nixpkgs-python";
      inputs = {nixpkgs.follows = "nixpkgs";};
    };

    kuriko-nur = {
      url = "github:kurikomoe/nur-packages";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  nixConfig = {
    substituters = [
      https://mirrors.ustc.edu.cn/nix-channels/store
      https://mirrors.tuna.tsinghua.edu.cn/nix-channels/store
      https://nix-community.cachix.org
      https://kurikomoe.cachix.org
    ];
    trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
      "kurikomoe.cachix.org-1:NewppX3NeGxT8OwdwABq+Av7gjOum55dTAG9oG7YeEI="
    ];
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        inputs.devenv.flakeModule
      ];

      systems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin"];

      perSystem = {
        config,
        self',
        inputs',
        system,
        lib,
        ...
      }: let
        pkgs = import inputs.nixpkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = [];
        };

        jdkCustom = pkgs.jdk17;
        kotlinCustom = pkgs.kotlin.override {jre = jdkCustom;};

        runtimeLibs = with pkgs; [];
      in {
        formatter = pkgs.alejandra;

        devenv.shells.default = {
          # Enable this to avoid forced -O2
          # hardeningDisable = [ "all" ];

          packages = with pkgs;
            [
              # tools
              just
              hello

              # server
              gradle
              jdkCustom
              kotlinCustom

              # web
              pnpm

              caddy
            ]
            ++ runtimeLibs;

          env = {
            LD_LIBRARY_PATH = lib.makeLibraryPath runtimeLibs;
            JWT_SECRET="asdfvbnm";
            DATA_PATH="./data";
          };

          dotenv.enable = true;

          process.managers.process-compose.settings = {
            "processes" = {
              "disable" = {
                command = "hello";
              };

              "server" = {
                depends_on = {
                  "database".condition = "process_start";
                  "web".condition = "process_start";
                };
              };

              "web::serve" = {
                depends_on = {
                  "web::dev".condition = "process_start";
                };
              };

              "server::dev" = {
                depends_on = {
                  "database".condition = "process_start";
                  "web::serve".condition = "process_start";
                };
              };
            };
          };

          processes = {
            "database".exec = ''
              docker-compose -f docker-compose-dev.yml up
            '';
            "web".exec = ''
              cd web
              pnpm dev:local
            '';

            "web::dev".exec = ''
              cd web
              pnpm build --watch
            '';

            "web::serve".exec = ''
              cd web
              caddy run -c Caddyfile.dev --adapter caddyfile
            '';

            "server::dev".exec = ''
              source ./nix/.env
              cd server
              ./gradlew installDist
              ./build/install/wneg/bin/wneg
            '';

            "server".exec = ''
              source ./nix/.env
              cd server
              ./gradlew installDist
              ./build/install/wneg/bin/wneg
            '';
          };

          enterShell = ''
            hello
          '';

          scripts.devenv-up.exec = ''
            procfilescript=$(nix build 'path:nix#devenv-up' --no-link --print-out-paths --no-pure-eval)
            if [ "$(cat $procfilescript|tail -n +2)" = "" ]; then
              echo "No 'processes' option defined: https://devenv.sh/processes/"
              exit 1
            else
              exec $procfilescript "$@"
            fi
          '';

          languages.python = {
            enable = false;
            package = pkgs.python312;
            uv.enable = true;
          };

          languages.typescript.enable = true;
          languages.javascript = {
            enable = true;

            pnpm = {
              enable = true;
              install.enable = true;
            };
          };


          pre-commit.addGcRoot = true;
          pre-commit.hooks = {
            alejandra.enable = true;

            # Python
            isort.enable = true;
            mypy.enable = true;
            pylint.enable = true;
            flake8.enable = true;

            # TS
            eslint.enable = true;
            eslint-typescript = {
              enable = true;
              name = "eslint typescript";
              entry = "pnpm exec eslint ";
              files = "\\.(tsx|ts|js)$";
              types = ["text"];
              excludes = ["dist/.*"];
              pass_filenames = true;
              verbose = true;
            };

            # Check Secrets
            trufflehog = {
              enable = true;
              entry = let
                script = pkgs.writeShellScript "precommit-trufflehog" ''
                  set -e
                  ${pkgs.trufflehog}/bin/trufflehog --no-update git "file://$(git rev-parse --show-toplevel)" --since-commit HEAD --results=verified --fail
                '';
              in
                builtins.toString script;
            };
          };

          cachix.pull = ["devenv"];
        };
      };
    };
}

