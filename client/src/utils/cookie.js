// cookieUtils.js

export function getCookie(cookieName) {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    // Check if this cookie starts with the name we want
    if (cookie.startsWith(cookieName + "=")) {
      // Return the value part (after the '=')
      return decodeURIComponent(cookie.substring(cookieName.length + 1));
    }
  }
  return null; // Cookie not found
}

export function setCookie(name, value, options = {}) {
  options = {
    path: "/", // Default path
    ...options,
  };

  // Set expiration if provided
  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  // Create the cookie string
  let updatedCookie =
    encodeURIComponent(name) + "=" + encodeURIComponent(value);

  // Add options to cookie string
  for (const optionKey in options) {
    updatedCookie += "; " + optionKey;
    const optionValue = options[optionKey];
    if (optionValue !== true) {
      updatedCookie += "=" + optionValue;
    }
  }

  // Set the cookie
  document.cookie = updatedCookie;
}

export function deleteCookie(name) {
  setCookie(name, "", {
    "max-age": -1,
  });
}

export function getUser() {
  const cookieValue = getCookie("exim_user");

  if (!cookieValue) {
    return null;
  }

  try {
    return JSON.parse(cookieValue);
  } catch (error) {
    console.error("Failed to parse exim_user cookie:", error);
    return null;
  }
}

export function setUser(user, options = {}) {
  const userJson = JSON.stringify(user);
  setCookie("exim_user", userJson, options);
}
