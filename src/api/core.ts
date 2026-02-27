import { apiFetch } from "@/lib/api-client";

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type RelationType = "PARENT" | "SIBLING" | "SPOUSE";

export type FamilyDto = {
  id: number;
  name: string;
};

export type CreateFamilyDto = {
  familyName: string;
};

export type PersonBasicDTO = {
  id?: number;
  name?: string;
  gender?: Gender;
};

export type RelationBasicDto = {
  person?: PersonBasicDTO;
  relationType?: RelationType;
};

export type PersonDto = {
  id?: number;
  name?: string;
  gender?: Gender;
  relations?: RelationBasicDto[];
};

export type PutPersonDto = {
  name?: string;
  gender?: Gender;
};

export type PostRelationDto = {
  fromId?: number;
  toId?: number;
  relationType?: RelationType;
};

export type PostPersonDto = {
  id?: number;
  name?: string;
  gender?: Gender;
  relations?: PostRelationDto[];
};

export type LayoutPositionDto = {
  nodeId: string;
  x: number;
  y: number;
};

export type TreeLayoutDto = {
  id?: number;
  familyId: number;
  layout: string;
};

export type SaveLayoutRequestDto = {
  positions: LayoutPositionDto[];
};

export type RelationDto = {
  toPerson?: PersonBasicDTO;
  fromPerson?: PersonBasicDTO;
  relationType?: RelationType;
};

export type RelationToken =
  | "UP"
  | "DOWN"
  | "SIDE"
  | "SPOUSE"
  | "GRANDPARENT"
  | "GRANDCHILD"
  | "PARENT"
  | "CHILD"
  | "PARENT_SIBLING"
  | "SIBLING"
  | "IN_LAW_PARENT"
  | "IN_LAW_SIBLING"
  | "IN_LAW_CHILD";

export type RelationStep = {
  relationToken?: RelationToken;
  genderEnum?: Gender;
};

export type RelationPathDto = {
  id?: number;
  path?: unknown[];
};

export function getAllPersons(): Promise<PersonDto[]> {
  return apiFetch<PersonDto[]>("/api/v1/core/persons");
}

export function createPerson(body: PostPersonDto): Promise<PersonDto> {
  return apiFetch<PersonDto>("/api/v1/core/persons", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPersonInFamily(
  familyId: number,
  body: PostPersonDto,
): Promise<PersonDto> {
  return apiFetch<PersonDto>(`/api/v1/core/families/${familyId}/persons`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getPersonById(id: number): Promise<PersonDto> {
  return apiFetch<PersonDto>(`/api/v1/core/persons/${id}`);
}

export function updatePerson(
  familyId: number,
  personId: number,
  body: PutPersonDto,
): Promise<PersonDto> {
  return apiFetch<PersonDto>(
    `/api/v1/core/families/${familyId}/persons/${personId}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}

export function deletePersonById(
  familyId: number,
  personId: number,
): Promise<string> {
  return apiFetch<string>(
    `/api/v1/core/families/${familyId}/persons/${personId}`,
    {
      method: "DELETE",
    },
  );
}

export function getAllRelations(): Promise<RelationDto[]> {
  return apiFetch<RelationDto[]>("/api/v1/core/relations");
}

export function createRelation(body: PostRelationDto): Promise<RelationDto> {
  return apiFetch<RelationDto>("/api/v1/core/relations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getRelationById(id: number): Promise<RelationDto> {
  return apiFetch<RelationDto>(`/api/v1/core/relations/${id}`);
}

export function updateRelationType(
  id: number,
  type: RelationType,
): Promise<RelationDto> {
  return apiFetch<RelationDto>(
    `/api/v1/core/relations/${id}?type=${encodeURIComponent(type)}`,
    {
      method: "PUT",
    },
  );
}

export function deleteRelationById(id: number): Promise<string> {
  return apiFetch<string>(`/api/v1/core/relations/${id}`, {
    method: "DELETE",
  });
}

export function getPersonRelations(id: number): Promise<RelationDto[]> {
  return apiFetch<RelationDto[]>(`/api/v1/core/persons/${id}/relations`);
}

export function getSimplifiedRelationPath(params: {
  from: number;
  to: number;
  lang?: string;
}): Promise<string> {
  const qs = new URLSearchParams({
    from: String(params.from),
    to: String(params.to),
  });
  if (params.lang) qs.set("lang", params.lang);

  return apiFetch<string>(`/api/v1/core/relations/simplified?${qs.toString()}`);
}

export function getAllFamilies(): Promise<FamilyDto[]> {
  return apiFetch<FamilyDto[]>("/api/v1/core/families");
}

export function getPersonsByFamily(familyId: number): Promise<PersonDto[]> {
  return apiFetch<PersonDto[]>(`/api/v1/core/families/${familyId}/persons`);
}

export function createFamily(data: CreateFamilyDto): Promise<FamilyDto> {
  return apiFetch<FamilyDto>("/api/v1/core/families", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getRelationPath(params: {
  from: number;
  to: number;
}): Promise<RelationStep> {
  const qs = new URLSearchParams({
    from: String(params.from),
    to: String(params.to),
  });

  return apiFetch<RelationStep>(`/api/v1/core/relations/path?${qs.toString()}`);
}

export function getRelationRawPath(params: {
  from: number;
  to: number;
}): Promise<RelationPathDto> {
  const qs = new URLSearchParams({
    from: String(params.from),
    to: String(params.to),
  });

  return apiFetch<RelationPathDto>(
    `/api/v1/core/relations/path/raw?${qs.toString()}`,
  );
}

export function getTreeLayout(familyId: number): Promise<TreeLayoutDto | null> {
  return apiFetch<TreeLayoutDto | null>(
    `/api/v1/core/families/${familyId}/layout`,
  );
}

export function saveTreeLayout(
  familyId: number,
  body: SaveLayoutRequestDto,
): Promise<TreeLayoutDto> {
  return apiFetch<TreeLayoutDto>(`/api/v1/core/families/${familyId}/layout`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
