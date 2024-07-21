const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadSingleFile = async (file, folderName) => {
  const { createReadStream, mimetype } = await file;

  const stream = createReadStream();
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];

  if (!allowedTypes.includes(mimetype)) {
    throw new Error("Invalid file type. Only PNG , JPG and JPEG are allowed.");
  }

  const uploadResult = await new Promise((resolve, reject) => {
    const streamLoad = cloudinary.uploader.upload_stream(
      { folder: folderName },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    stream.pipe(streamLoad);
  });
  return uploadResult.secure_url;
};

exports.clearImage = async (imageUrl, folderName) => {
  const publicId = extractPublicId(imageUrl, folderName);
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log(error);
  }
};

const extractPublicId = (imageUrl, folderName) => {
  const pathAfterFolder = imageUrl.split(folderName)[1];
  const [publicIdPart] = pathAfterFolder.split(".");
  return `${folderName}${publicIdPart}`;
};
