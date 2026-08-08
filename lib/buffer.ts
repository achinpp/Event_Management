// Buffer GraphQL API integration.
// Docs: https://developers.buffer.com
// Endpoint: https://api.buffer.com
// Auth: Bearer token in Authorization header.

const BUFFER_ENDPOINT = "https://api.buffer.com";

function getHeaders(): HeadersInit {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not set in .env.local");
  return {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  };
}

/**
 * List available channels. Used to resolve BUFFER_CHANNEL_ID if not set.
 */
export async function listChannels(): Promise<
  Array<{ id: string; name: string; service: string }>
> {
  const query = `
    query GetChannels {
      channels {
        id
        name
        service
      }
    }
  `;
  const res = await fetch(BUFFER_ENDPOINT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`Buffer listChannels failed ${res.status}: ${detail}`);
  }
  const json = await res.json();
  return json.data?.channels ?? [];
}

/**
 * Schedule a post to Buffer.
 * - text: the post caption + hashtags
 * - imageUrl: a publicly accessible image URL (Buffer fetches it)
 * - dueAt: ISO 8601 datetime string
 *
 * Returns the buffer post ID.
 */
export async function scheduleToBuffer(opts: {
  text: string;
  imageUrl?: string | null;
  dueAt: string;
}): Promise<string> {
  const channelId = process.env.BUFFER_CHANNEL_ID;
  if (!channelId) throw new Error("BUFFER_CHANNEL_ID is not set in .env.local");

  // Build the assets array if we have an image URL.
  const assets = opts.imageUrl
    ? [{ image: { url: opts.imageUrl } }]
    : undefined;

  const mutation = `
    mutation CreateScheduledPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            dueAt
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      text: opts.text,
      channelId,
      schedulingType: "automatic",
      mode: "customScheduled",
      dueAt: opts.dueAt,
      ...(assets && { assets }),
    },
  };

  const res = await fetch(BUFFER_ENDPOINT, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query: mutation, variables }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`Buffer createPost failed ${res.status}: ${detail}`);
  }

  const json = await res.json();
  const result = json.data?.createPost;

  // Handle MutationError response.
  if (result?.message) {
    throw new Error(`Buffer createPost error: ${result.message}`);
  }

  const postId = result?.post?.id;
  if (!postId) {
    throw new Error(
      `Buffer createPost returned unexpected shape: ${JSON.stringify(json)}`
    );
  }

  return postId;
}
