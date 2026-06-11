"use client";

import { useParams } from "next/navigation";
import { RDOForm } from "@/components/RDOForm";

export default function EditarRdoPage() {
  const params = useParams();
  const rdoId = params?.id as string;

  return <RDOForm rdoId={rdoId} />;
}