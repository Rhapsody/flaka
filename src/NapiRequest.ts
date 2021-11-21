const apiUrl = {
  integration: {
    napi: 'https://api-int.napster.com/v2.2/',
  },
  beta: {
    napi: 'https://api-beta.napster.com/v2.2/',
  },
  development: {
    napi: 'https://api-beta.napster.com/v2.2/',
  },
  production: {
    napi: 'https://api.napster.com/v2.2/',
  },
};

interface NapiReqestParam {
  path: string;
  napiToken: string;
  napiEnviroment: string;
  napiCatalog: string;
  options: {
    [key: string]: { [key: string]: string } | string;
  };
}

export const NapiRequest = async function napiRequest(param: NapiReqestParam): Promise<Response> {
  const { path, napiToken, options, napiEnviroment, napiCatalog } = param;
  if (!path) {
    throw new Error('path is missing');
  }

  if (!options) {
    throw new Error('options argument is missing');
  }

  if (!options.method) {
    throw new Error('options.method is missing');
  }
  if (!options.queryparams) {
    options.queryparams = {};
  }

  let reqPath = `${apiUrl[napiEnviroment].napi}${path}`;

  const params: { method: string; headers: { [key: string]: string }; body?: string } = {
    method: options.method as string,
    headers: {
      Accept: 'application/json, text/javascript, /; q=0.01',
    },
  };
  params.headers['Authorization'] = `Bearer ${napiToken}`;
  params.headers['Content-Type'] = 'application/json';

  options.queryparams['catalog'] = napiCatalog;

  if (options.queryparams) {
    reqPath += `?${new URLSearchParams(options.queryparams).toString()}`;
  }

  if (options.body) {
    params.body = JSON.stringify(options.body);
  }
  const respone = await window.fetch(reqPath, params);
  return respone;
};
