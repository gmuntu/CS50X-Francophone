import { auth } from '@/auth';
import CoursesClient from './_components/courses-client';

export default async function CoursesPage() {
  const session = await auth();
  return <CoursesClient isLoggedIn={!!session} />;
}
