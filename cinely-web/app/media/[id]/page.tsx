import React from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { MediaDetailView } from '../../../components/media/MediaDetailView';

interface MediaPageProps {
  params: Promise<{ id: string }>;
}

export default async function MediaPage({ params }: MediaPageProps) {
  const resolvedParams = await params;
  const canonicalId = decodeURIComponent(resolvedParams.id);

  return (
    <>
      <Navbar />
      <main>
        <MediaDetailView canonicalId={canonicalId} />
      </main>
    </>
  );
}
