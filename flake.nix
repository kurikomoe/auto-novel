{
  description = "auto-noval development environment";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";

    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";

    pre-commit-hooks.url = "github:cachix/git-hooks.nix";

    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";

    nixpkgs-python = {
      url = "github:cachix/nixpkgs-python";
      inputs = {nixpkgs.follows = "nixpkgs";};
    };
  };

  nixConfig = {
    extra-trusted-public-keys = "devenv.cachix.org-1:w1cLUi8dv3hnoSPGAuibQv+f9TZLr6cv/Hm9XgU50cw=";
    extra-substituters = "https://devenv.cachix.org";
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        inputs.devenv.flakeModule
        inputs.pre-commit-hooks.flakeModule
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
          overlays = [ ];
        };

        kotlin_jdk17 = pkgs.kotlin.override { jre = pkgs.jdk17; };
      in {
        formatter = pkgs.alejandra;

        devenv.shells.default = {
          packages = with pkgs; [
            hello
            mongodb-ce

            kotlin_jdk17
            gradle_7
            jdk17
          ];

          pre-commit.hooks = {
            alejandra.enable = true;
            shellcheck.enable = true;
            trufflehog.enable = true;
          };

          enterShell = ''
            hello
          '';

            cachix.pull = ["devenv"];
        };

      };
    };
}
