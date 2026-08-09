import RegistrationsClient from "./registrations-client";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegistrationsClient eventId={id} />;
}
