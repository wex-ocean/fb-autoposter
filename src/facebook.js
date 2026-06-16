const axios = require("axios");

const BASE_URL = "https://graph.facebook.com/v19.0";

const apiConfig = {
  baseUrl: BASE_URL,
  useDummyApi: false,
  dummyApiEndpoint: null
};

function configureApi(options) {
  if (options.useDummyApi) {
    apiConfig.useDummyApi = true;
    apiConfig.dummyApiEndpoint = options.dummyApiEndpoint;
    apiConfig.baseUrl = options.dummyApiEndpoint;
  } else {
    apiConfig.useDummyApi = false;
    apiConfig.dummyApiEndpoint = null;
    apiConfig.baseUrl = options.baseUrl || BASE_URL;
  }
}

function getApiConfig() {
  return apiConfig;
}

async function apiRequest(method, endpoint, params = {}, data = null) {
  if (apiConfig.useDummyApi) {
    const url = `${apiConfig.baseUrl}${endpoint}`;
    const options = {
      method,
      url,
      params,
      data
    };
    const response = await axios(options);
    return response.data;
  }

  const url = `${apiConfig.baseUrl}${endpoint}`;
  const options = {
    method,
    url,
    params: {
      access_token: params.access_token,
      fields: params.fields || "id,message,full_picture,story,created_time,attachments",
      limit: params.limit || 5,
      ...(params.extraParams || {})
    }
  };

  if (data) {
    options.data = data;
    options.params = {
      access_token: params.access_token,
      ...(params.extraParams || {})
    };
  }

  const response = await axios(options);
  return response.data;
}

async function getPagePosts(pageId, accessToken) {
  const response = await apiRequest("GET", `/${pageId}/posts`, { access_token: accessToken });
  return response.data;
}

async function publishPost(targetPageId, targetPageToken, postData) {
  const { message, imageUrl } = postData;

  if (imageUrl) {
    const response = await apiRequest("POST", `/${targetPageId}/photos`, { access_token: targetPageToken }, null, {
      url: imageUrl,
      caption: message || "",
      published: true
    });
    return response;
  } else {
    const response = await apiRequest("POST", `/${targetPageId}/feed`, { access_token: targetPageToken }, null, {
      message: message || "(No text)",
      published: true
    });
    return response;
  }
}

async function validateToken(accessToken) {
  try {
    const response = await apiRequest("GET", "/me", { access_token: accessToken, fields: "id,name" });
    return { valid: true, data: response };
  } catch (err) {
    return { valid: false, error: err.response?.data?.error?.message || err.message };
  }
}

module.exports = {
  getPagePosts,
  publishPost,
  validateToken,
  configureApi,
  getApiConfig
};
