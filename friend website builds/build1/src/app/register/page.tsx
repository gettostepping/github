import { redirect } from 'next/navigation';

export default function RegisterRedirectPage({ 
  searchParams 
}: { 
  searchParams: { code?: string } 
}) {
  const codeParam = searchParams.code ? `?code=${searchParams.code}` : '';
  redirect(`/auth/register${codeParam}`);
}

