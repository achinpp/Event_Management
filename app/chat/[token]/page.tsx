import Chat from "./chat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <Chat token={token} />;
}
