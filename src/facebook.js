const axios = require("axios");

const BASE_URL = "https://graph.facebook.com/v19.0";

/**
 * Fetch recent posts from a Facebook page
 * Requires: pages_read_engagement permission
 */
async function getPagePosts(pageId, accessToken) {
  const url = `${BASE_URL}/${pageId}/posts`;
  const response = await axios.get(url, {
    params: {
      access_token: accessToken,
      fields: "id,message,full_picture,story,created_time,attachments",
      limit: 5,
    },
  });
  return response.data.data; // array of posts
}

/**
 * Publish a text + optional image post to target page
 * Requires: pages_manage_posts permission
 */
async function publishPost(targetPageId, targetPageToken, postData) {
  const { message, imageUrl } = postData;

  if (imageUrl) {
    // Post with image
    const url = `${BASE_URL}/${targetPageId}/photos`;
    const response = await axios.post(url, null, {
      params: {
        access_token: targetPageToken,
        url: imageUrl,
        caption: message || "",
        published: true,
      },
    });
    return response.data;
  } else {
    // Text-only post
    const url = `${BASE_URL}/${targetPageId}/feed`;
    const response = await axios.post(url, null, {
      params: {
        access_token: targetPageToken,
        message: message || "(No text)",
        published: true,
      },
    });
    return response.data;
  }
}

/**
 * Validate a page access token
 */
async function validateToken(accessToken) {
  try {
    const url = `${BASE_URL}/me`;
    const response = await axios.get(url, {
      params: { access_token: accessToken, fields: "id,name" },
    });
    return { valid: true, data: response.data };
  } catch (err) {
    return { valid: false, error: err.response?.data?.error?.message || err.message };
  }
}

module.exports = { getPagePosts, publishPost, validateToken };
