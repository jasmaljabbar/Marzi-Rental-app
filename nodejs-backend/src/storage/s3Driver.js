const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// Any S3-compatible object store: AWS S3, Cloudflare R2, DigitalOcean Spaces,
// MinIO. The bucket should be private; public images can be exposed through a
// CDN via S3_PUBLIC_BASE_URL, private ones are always proxied by the API.
function createS3Driver({ bucket, region, endpoint, accessKeyId, secretAccessKey, forcePathStyle, client }) {
  const s3 =
    client ||
    new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });

  async function streamToBuffer(body) {
    if (!body) return null;
    if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
    const chunks = [];
    for await (const chunk of body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  function isMissing(err) {
    return err && (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404);
  }

  return {
    name: "s3",
    async put(key, buffer, contentType) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );
    },
    async getBuffer(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return streamToBuffer(res.Body);
      } catch (err) {
        if (isMissing(err)) return null;
        throw err;
      }
    },
    async getStream(key) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return { stream: res.Body, size: res.ContentLength };
      } catch (err) {
        if (isMissing(err)) return null;
        throw err;
      }
    },
    async delete(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

module.exports = { createS3Driver };
