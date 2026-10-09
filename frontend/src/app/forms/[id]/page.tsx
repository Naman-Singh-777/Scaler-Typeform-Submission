import { redirect } from 'next/navigation';

export default function FormIndex({ params }: { params: { id: string } }) {
  redirect(`/forms/${params.id}/edit`);
}
