// Buffer GraphQL API. Endpoint, auth, and mutation shapes taken from the
// live docs (developers.buffer.com: Quick Start, Posts & Scheduling,
// "Create an Image Post", "Get Channels") — /rules #8.
const ENDPOINT = "https://api.buffer.com";

async function gql<T>(query: string): Promise<T> {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY is not set");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Buffer API ${res.status}: ${JSON.stringify(json)?.slice(0, 300)}`
    );
  }
  if (json?.errors?.length) {
    throw new Error(`Buffer API: ${json.errors[0].message}`);
  }
  return json.data as T;
}

export interface BufferChannel {
  id: string;
  name: string;
  displayName: string | null;
  service: string;
}

export async function listChannels(): Promise<BufferChannel[]> {
  const account = await gql<{ account: { organizations: { id: string }[] } }>(
    `query GetOrganizations { account { organizations { id } } }`
  );
  const orgId = account.account.organizations[0]?.id;
  if (!orgId) throw new Error("Buffer account has no organizations");

  const data = await gql<{ channels: BufferChannel[] }>(
    `query GetChannels {
      channels(input: { organizationId: ${JSON.stringify(orgId)} }) {
        id
        name
        displayName
        service
      }
    }`
  );
  return data.channels;
}

// createPost per the live docs: customScheduled + dueAt (ISO 8601 UTC),
// optional image attached by public URL (Buffer's servers fetch it).
// Supports automatic and notification schedulingType with Instagram metadata support.
export async function createScheduledPost(opts: {
  channelId: string;
  text: string;
  dueAt: string;
  imageUrl?: string;
  service?: string;
}): Promise<{ id: string; dueAt: string | null }> {
  const isInstagram = opts.service ? opts.service.toLowerCase().includes("instagram") : true;

  const executeCreatePost = async (schedulingType: "automatic" | "notification") => {
    const inputFields = [
      `text: ${JSON.stringify(opts.text)}`,
      `channelId: ${JSON.stringify(opts.channelId)}`,
      `schedulingType: ${schedulingType}`,
      `mode: customScheduled`,
      `dueAt: ${JSON.stringify(opts.dueAt)}`,
    ];

    // Fallback public event placeholder image for Instagram if no image provided
    const imgUrl = opts.imageUrl || (isInstagram ? "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800" : undefined);
    if (imgUrl) {
      inputFields.push(
        `assets: [{ image: { url: ${JSON.stringify(imgUrl)} } }]`
      );
    }

    if (isInstagram || schedulingType === "notification") {
      inputFields.push(
        `metadata: { instagram: { type: post, shouldShareToFeed: true } }`
      );
    }

    const data = await gql<{
      createPost: { post?: { id: string; dueAt: string | null }; message?: string };
    }>(
      `mutation CreatePost {
        createPost(input: { ${inputFields.join(", ")} }) {
          ... on PostActionSuccess { post { id dueAt } }
          ... on MutationError { message }
        }
      }`
    );
    return data.createPost;
  };

  // Try notification scheduling first if service is instagram, or fallback if required
  let result = await executeCreatePost(isInstagram ? "notification" : "automatic");

  if (!result?.post && result?.message?.includes("notification scheduling")) {
    result = await executeCreatePost("notification");
  }

  if (!result?.post) {
    throw new Error(result?.message ?? "Buffer createPost failed");
  }
  return result.post;
}
