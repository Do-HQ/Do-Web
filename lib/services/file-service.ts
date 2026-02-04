import axiosInstance from ".";

const FILE_ENDPOINTS = {
  UPLOAD: "/file/upload",
  DELETE: "/file",
};

export const uploadFile = async (data: FormData) => {
  const response = await axiosInstance.post(FILE_ENDPOINTS.UPLOAD, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response;
};

export const deleteFile = async (id: string) => {
  const response = await axiosInstance.delete(`${FILE_ENDPOINTS.DELETE}/${id}`);
  return response;
};
