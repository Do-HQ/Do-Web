import apiClient from "./index";

export type OgPreviewData = {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
};

export const getOgPreview = async (url: string): Promise<OgPreviewData> => {
  const response = await apiClient.get<OgPreviewData>("/public/og", {
    params: { url },
  });
  return response.data;
};
