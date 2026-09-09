
import api from "./itHelpdeskAPI";

const emailAPI = {
  config: {
    get: () => api.get("/admin/email/config").then((r) => r.data),
    save: (config) => api.post("/admin/email/config", config).then((r) => r.data),
    test: (config) => api.post("/admin/email/test", config).then((r) => r.data),
    sendTest: (data) => api.post("/admin/email/send-test", data).then((r) => r.data),
    send: (data) => api.post("/admin/email/send", data).then((r) => r.data),
  },
};

export default emailAPI;
