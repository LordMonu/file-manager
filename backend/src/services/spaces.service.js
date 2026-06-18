import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env.js';
import { spacesConfig } from '../config/spaces.js';
import { ApiError } from '../utils/ApiError.js';

function createS3Client() {
  assertSpacesConfig();

  return new S3Client({
    region: spacesConfig.region,
    endpoint: spacesConfig.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: spacesConfig.key,
      secretAccessKey: spacesConfig.secret,
    },
  });
}

let s3;

function getS3Client() {
  if (!s3) {
    s3 = createS3Client();
  }

  return s3;
}

function assertSpacesConfig() {
  const required = [
    ['DO_SPACES_ENDPOINT', spacesConfig.endpoint],
    ['DO_SPACES_REGION', spacesConfig.region],
    ['DO_SPACES_KEY', spacesConfig.key],
    ['DO_SPACES_SECRET', spacesConfig.secret],
    ['DO_SPACES_BUCKET', spacesConfig.bucket],
    ['DO_SPACES_PUBLIC_BASE_URL', spacesConfig.publicBaseUrl],
  ];

  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new ApiError(500, `Missing Spaces config: ${missing.join(', ')}`);
  }
}

export async function createUploadUrl({ objectKey, contentType, expiresIn }) {
  const command = new PutObjectCommand({
    Bucket: spacesConfig.bucket,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });

  return {
    uploadUrl,
    publicUrl: `${spacesConfig.publicBaseUrl}/${objectKey}`,
  };
}

export async function createReadUrl({ objectKey, responseContentDisposition }) {
  const command = new GetObjectCommand({
    Bucket: spacesConfig.bucket,
    Key: objectKey,
    ResponseContentDisposition: responseContentDisposition,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: env.READ_URL_EXPIRES_SECONDS,
  });
}

export async function objectExists(objectKey) {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: spacesConfig.bucket,
        Key: objectKey,
      }),
    );
    return true;
  } catch (_error) {
    return false;
  }
}

export async function deleteObject(objectKey) {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: spacesConfig.bucket,
      Key: objectKey,
    }),
  );
}

export function getUploadExpirySeconds() {
  return env.UPLOAD_URL_EXPIRES_SECONDS;
}
