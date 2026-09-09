import authAPI from "./authAPI";

export const adminAPI = {
  myBranches: () => authAPI.get("/admin/my-branches"),
  // Add other admin endpoints here as needed
};
