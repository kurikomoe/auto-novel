import ky from 'ky';

let tokenGetter: () => string = () => '';

export const client = ky.create({
  prefixUrl: '/api',
  timeout: 60000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenGetter();
        if (token) {
          request.headers.set('Authorization', 'Bearer ' + token);
        }
      },
    ],
  },
});

export const setTokenGetter = (getter: () => string) => {
  tokenGetter = getter;
};

export const uploadFile = (
  url: string,
  name: string,
  file: File,
  onProgress: (p: number) => void,
) => {
  return new Promise<string>(function (resolve, reject) {
    const formData = new FormData();
    formData.append(name, file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    const token = tokenGetter();
    if (token) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    }
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(xhr.responseText));
      }
    };
    xhr.upload.addEventListener('progress', (e) => {
      const percent = e.lengthComputable ? (e.loaded / e.total) * 100 : 0;
      onProgress(Math.ceil(percent));
    });
    xhr.send(formData);
  });
};
