import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { podcastVoiceConfig } from '@/lib/podcast-voices';
import VoixClient from './_components/voix-client';

export default async function AdminVoixPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth/login');
  if ((session.user as any)?.role !== 'ADMIN') redirect('/admin');
  return <VoixClient config={podcastVoiceConfig()} />;
}
