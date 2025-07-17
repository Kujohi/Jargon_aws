export const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL;
};

export const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL;
};

export const createUrl = (path) => {
  return `${getBaseUrl()}${path}`;
}; 