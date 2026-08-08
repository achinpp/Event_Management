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
export async function createScheduledPost(opts: {
  channelId: string;
  text: string;
  dueAt: string;
  imageUrl?: string;
}): Promise<{ id: string; dueAt: string | null }> {
  const inputFields = [
    `text: ${JSON.stringify(opts.text)}`,
    `channelId: ${JSON.stringify(opts.channelId)}`,
    `schedulingType: automatic`,
    `mode: customScheduled`,
    `dueAt: ${JSON.stringify(opts.dueAt)}`,
  ];
  if (opts.imageUrl) {
    inputFields.push(
      `assets: [{ image: { url: ${JSON.stringify(opts.imageUrl)} } }]`
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
  if (!data.createPost?.post) {
    throw new Error(data.createPost?.message ?? "Buffer createPost failed");
  }
  return data.createPost.post;
}
