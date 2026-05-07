import api from "./api";

export const dashboardService = {
  async getOverview() {
    const response = await api.get("/analytics/overview");
    return response.data.data;
  },
  async getAttendanceLogs() {
    const response = await api.get("/attendance");
    return response.data.data;
  },
  async getStudents() {
    const response = await api.get("/students");
    return response.data.data;
  },
  async getStudentFaces() {
    const response = await api.get("/students/faces");
    return response.data.data;
  },
  async createStudent(payload) {
    const response = await api.post("/students", payload);
    return response.data.data;
  },
  async registerFace(studentId, payload) {
    const response = await api.post(`/students/${studentId}/register-face`, payload);
    return response.data.data;
  },
  async startHardwareRegistration(studentId, payload) {
    const response = await api.post(`/students/${studentId}/hardware-register/start`, payload);
    return response.data.data;
  },
  async getHardwareRegistrationStatus() {
    const response = await api.get("/students/hardware-register/status");
    return response.data.data;
  },
  async cancelHardwareRegistration() {
    const response = await api.post("/students/hardware-register/cancel");
    return response.data.data;
  },
  async getProfile() {
    const response = await api.get("/auth/me");
    return response.data.data;
  },
  async updateProfile(payload) {
    const response = await api.put("/settings/profile", payload);
    return response.data.data;
  },
};
