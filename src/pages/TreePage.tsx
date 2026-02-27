import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, Zoom, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./TreePage.css";
import {
  getSimplifiedRelationPath,
  type Gender,
  type PersonDto,
  updatePerson,
  deletePersonById,
  createPersonInFamily,
  createRelation,
  type RelationType,
  getAllFamilies,
  createFamily,
  type FamilyDto,
  type CreateFamilyDto,
  getPersonsByFamily,
} from "@/api/core";
import FamilyChartView, {
  type FamilyChartViewHandle,
} from "@/components/tree/FamilyChartView";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PersonFormState = {
  name: string;
  gender: Gender;
};

const genderOptions: Gender[] = ["MALE", "FEMALE", "UNKNOWN"];
const relationTypeOptions: RelationType[] = ["PARENT", "SIBLING", "SPOUSE"];
const languageOptions = [
  { value: "kannada", label: "Kannada" },
  { value: "tulu", label: "Tulu" },
];

export default function TreePage() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const familyChartRef = useRef<FamilyChartViewHandle>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persons, setPersons] = useState<PersonDto[]>([]);
  const [currentFamily, setCurrentFamily] = useState<FamilyDto | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [saveLayoutError, setSaveLayoutError] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);

  const [decoderLang, setDecoderLang] = useState("tulu");
  const [decoderLoading, setDecoderLoading] = useState(false);
  const [decoderResult, setDecoderResult] = useState<string | null>(null);
  const [decoderError, setDecoderError] = useState<string | null>(null);

  const lastDecodedKeyRef = useRef<string | null>(null);

  const [personFormMode, setPersonFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [personForm, setPersonForm] = useState<PersonFormState>({
    name: "",
    gender: "MALE",
  });
  const [personSaving, setPersonSaving] = useState(false);
  const [personSaveError, setPersonSaveError] = useState<string | null>(null);

  // Relation creation state - support multiple Person B selections
  const [relationForm, setRelationForm] = useState<{
    fromId: number | undefined;
    toIds: number[];
    relationType: RelationType;
  }>({
    fromId: undefined,
    toIds: [],
    relationType: "PARENT",
  });
  const [relationSaving, setRelationSaving] = useState(false);
  const [relationSaveError, setRelationSaveError] = useState<string | null>(
    null,
  );

  // Family state
  const [families, setFamilies] = useState<FamilyDto[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [familyForm, setFamilyForm] = useState<CreateFamilyDto>({
    familyName: "",
  });
  const [familySaving, setFamilySaving] = useState(false);
  const [familySaveError, setFamilySaveError] = useState<string | null>(null);

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  async function load() {
    if (!familyId) return;

    setError(null);
    setLoading(true);
    try {
      const p = await getPersonsByFamily(Number(familyId));
      setPersons(p);

      // Get family details
      const families = await getAllFamilies();
      const family = families.find((f) => f.id === Number(familyId));
      setCurrentFamily(family || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadFamilies() {
    setFamilyError(null);
    setFamilyLoading(true);
    try {
      const f = await getAllFamilies();
      setFamilies(f);
    } catch (err) {
      setFamilyError(
        err instanceof Error ? err.message : "Failed to load families",
      );
    } finally {
      setFamilyLoading(false);
    }
  }

  async function submitFamily() {
    if (!familyForm.familyName.trim()) {
      setFamilySaveError("Family name is required");
      return;
    }
    setFamilySaveError(null);
    setFamilySaving(true);
    try {
      await createFamily(familyForm);
      setFamilyForm({ familyName: "" });
      await loadFamilies();
      toast.success("Family created successfully");
    } catch (err) {
      setFamilySaveError(
        err instanceof Error ? err.message : "Failed to create family",
      );
    } finally {
      setFamilySaving(false);
    }
  }

  useEffect(() => {
    void load();
    void loadFamilies();
  }, [familyId]);

  useEffect(() => {
    async function decodeRelation(a: string, b: string, lang: string) {
      const key = `${a}-${b}-${lang}`;
      if (lastDecodedKeyRef.current === key) return;
      lastDecodedKeyRef.current = key;

      setDecoderLoading(true);
      setDecoderResult(null);
      setDecoderError(null);
      try {
        const res = await getSimplifiedRelationPath({
          from: Number(a),
          to: Number(b),
          lang,
        });
        setDecoderResult(res);
        toast.success(res);
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 502) {
          const msg = "No connecting relation found.";
          setDecoderResult(msg);
          toast.error(msg);
        } else {
          const msg =
            err instanceof Error ? err.message : "Failed to decode relation";
          setDecoderError(msg);
          toast.error(msg);
        }
      } finally {
        setDecoderLoading(false);
      }
    }

    async function run() {
      if (!selectedA || !selectedB) return;

      await decodeRelation(selectedA, selectedB, decoderLang);
    }

    void run();
  }, [decoderLang, selectedA, selectedB]);

  function onPersonPick(personId: string) {
    setActivePersonId(personId);

    if (!selectedA) {
      setSelectedA(personId);
      setSelectedB(null);
      setDecoderResult(null);
      setDecoderError(null);
    } else if (selectedA === personId) {
      // Deselect A
      setSelectedA(null);
      setSelectedB(null);
      setDecoderResult(null);
      setDecoderError(null);
    } else if (!selectedB) {
      setSelectedB(personId);
      setDecoderResult(null);
      setDecoderError(null);
    } else if (selectedB === personId) {
      // Deselect B, keep A
      setSelectedB(null);
      setDecoderResult(null);
      setDecoderError(null);
    } else {
      // New selection: replace A with this, clear B
      setSelectedA(personId);
      setSelectedB(null);
      setDecoderResult(null);
      setDecoderError(null);
    }
  }

  function startCreatePerson() {
    setPersonFormMode("create");
    setPersonForm({ name: "", gender: "MALE" });
    setPersonSaveError(null);
    setActivePersonId(null);
  }

  function startEditPerson(person: PersonDto) {
    if (!person.id) return;
    setPersonFormMode("edit");
    setPersonForm({
      name: person.name ?? "",
      gender: person.gender ?? "UNKNOWN",
    });
    setPersonSaveError(null);
    setActivePersonId(String(person.id));
  }

  async function submitPerson() {
    setPersonSaveError(null);
    setPersonSaving(true);
    try {
      if (personFormMode === "create") {
        if (!familyId) {
          setPersonSaveError("Family ID is required to create a person");
          return;
        }
        await createPersonInFamily(Number(familyId), {
          name: personForm.name,
          gender: personForm.gender,
        });
        setPersonForm({ name: "", gender: "UNKNOWN" });
      } else {
        if (!activePersonId || !familyId) return;
        await updatePerson(Number(familyId), Number(activePersonId), {
          name: personForm.name,
          gender: personForm.gender,
        });
      }
      await load();
    } catch (err) {
      setPersonSaveError(
        err instanceof Error ? err.message : "Failed to save person",
      );
    } finally {
      setPersonSaving(false);
    }
  }

  async function removePerson() {
    if (!activePersonId || !familyId) return;
    setPersonSaveError(null);
    setPersonSaving(true);
    try {
      await deletePersonById(Number(familyId), Number(activePersonId));
      await load();
      setPersonForm({ name: "", gender: "UNKNOWN" });
      setActivePersonId(null);
    } catch (err) {
      setPersonSaveError(
        err instanceof Error ? err.message : "Failed to delete person",
      );
    } finally {
      setPersonSaving(false);
    }
  }

  async function submitRelation() {
    if (!relationForm.fromId || relationForm.toIds.length === 0) {
      setRelationSaveError("Please select Person A and at least one Person B");
      return;
    }
    if (relationForm.toIds.includes(relationForm.fromId)) {
      setRelationSaveError("Person A cannot be in the Person B list");
      return;
    }

    setRelationSaveError(null);
    setRelationSaving(true);
    try {
      // Create relations for each selected Person B
      const promises = relationForm.toIds.map((toId) =>
        createRelation({
          fromId: relationForm.fromId!,
          toId,
          relationType: relationForm.relationType,
        }),
      );
      await Promise.all(promises);
      setRelationForm({ fromId: undefined, toIds: [], relationType: "PARENT" });
      await load();
      const count = relationForm.toIds.length;
      toast.success(
        `${count} relation${count > 1 ? "s" : ""} created successfully`,
      );
    } catch (err) {
      setRelationSaveError(
        err instanceof Error ? err.message : "Failed to create relation",
      );
    } finally {
      setRelationSaving(false);
    }
  }

  async function decode() {
    setDecoderError(null);
    setDecoderResult(null);
    if (!selectedA || !selectedB) {
      setDecoderError("Select two people in the tree");
      return;
    }

    setDecoderLoading(true);
    try {
      const result = await getSimplifiedRelationPath({
        from: Number(selectedA),
        to: Number(selectedB),
        lang: decoderLang,
      });
      setDecoderResult(result);
    } catch (err) {
      setDecoderError(
        err instanceof Error ? err.message : "Failed to decode relation",
      );
    } finally {
      setDecoderLoading(false);
    }
  }

  async function saveLayout() {
    setSaveLayoutError(null);
    setIsSavingLayout(true);
    try {
      if (familyChartRef.current) {
        await familyChartRef.current.saveLayout();
        setLastSaveTime(Date.now());
        toast.success("Layout saved successfully");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save layout";
      setSaveLayoutError(msg);
      toast.error(msg);
    } finally {
      setIsSavingLayout(false);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] lg:h-[calc(100dvh-56px)]">
      {/* Family Navigation Header */}
      <div className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              onClick={() => navigate("/")}
            >
              ← Back to Families
            </button>
            {currentFamily && (
              <div>
                <span className="font-semibold">{currentFamily.name}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  Family ID: {currentFamily.id}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${
                location.pathname === `/tree/${familyId}`
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              }`}
              onClick={() => navigate(`/tree/${familyId}`)}
            >
              Tree
            </button>
            <button
              className={`rounded-md px-3 py-1.5 text-sm ${
                location.pathname === `/relations`
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent"
              }`}
              onClick={() => navigate("/relations")}
            >
              Relations
            </button>
            {location.pathname === `/tree/${familyId}` && (
              <button
                className="rounded-md bg-green-600 text-white px-3 py-1.5 text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void saveLayout()}
                disabled={isSavingLayout}
              >
                {isSavingLayout ? "Saving..." : "Save Layout"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-[calc(100dvh-112px)] lg:h-[calc(100dvh-112px)] grid grid-cols-1 lg:grid-cols-[1fr_380px]">
        {/* Mobile sidebar toggle button */}
        <button
          className="lg:hidden fixed top-4 right-4 z-20 rounded-md border bg-card/80 backdrop-blur p-2 shadow-md"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="relative h-full min-h-[400px]">
          <div className="absolute top-3 left-3 z-10 rounded-md border bg-card/80 backdrop-blur px-2 py-1 text-xs text-muted-foreground">
            People: {persons.filter((p) => p.id != null).length}
          </div>
          {loading ? (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : error ? (
            <div className="h-full grid place-items-center p-6">
              <div className="max-w-md w-full rounded-xl border bg-card p-6">
                <div className="text-sm text-destructive">{error}</div>
                <button
                  className="mt-4 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                  onClick={() => void load()}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : persons.filter((p) => p.id != null).length === 0 ? (
            <div className="h-full grid place-items-center p-6">
              <div className="max-w-md w-full rounded-xl border bg-card p-6">
                <div className="text-sm text-muted-foreground">
                  No people yet. Create your first person.
                </div>
                <button
                  className="mt-4 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm"
                  onClick={startCreatePerson}
                >
                  Create person
                </button>
              </div>
            </div>
          ) : (
            <FamilyChartView
              ref={familyChartRef}
              persons={persons}
              selectedA={selectedA}
              selectedB={selectedB}
              onPersonClick={onPersonPick}
              familyId={familyId ? Number(familyId) : undefined}
            />
          )}
        </div>

        <aside
          className={`fixed lg:relative top-0 right-0 h-full w-80 max-w-[90vw] bg-background border-l border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
            mobileSidebarOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full overflow-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Tools</div>
              <div className="flex items-center gap-2">
                {/* Mobile close button */}
                <button
                  className="lg:hidden rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <button
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                  onClick={startCreatePerson}
                >
                  New person
                </button>
              </div>
            </div>

            {/* People List Section */}
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium mb-3">People in Family</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {persons.filter((p) => p.id != null).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No people yet
                  </div>
                ) : (
                  persons
                    .filter((p) => p.id != null)
                    .map((person) => (
                      <button
                        key={person.id}
                        onClick={() => startEditPerson(person)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          activePersonId === String(person.id)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <div className="font-medium">{person.name}</div>
                        <div className="text-xs opacity-70">
                          {person.gender}
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium">Person</div>
              <div className="mt-3 space-y-3">
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={
                      personFormMode === "create" ? "Enter name..." : ""
                    }
                    value={personForm.name}
                    onChange={(e) =>
                      setPersonForm((s) => ({ ...s, name: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    Gender
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={personForm.gender}
                    onChange={(e) =>
                      setPersonForm((s) => ({
                        ...s,
                        gender: e.target.value as Gender,
                      }))
                    }
                  >
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {personSaveError ? (
                  <div className="text-sm text-destructive">
                    {personSaveError}
                  </div>
                ) : null}

                <div className="flex gap-2 flex-col">
                  <div className="flex gap-2">
                    <button
                      className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                      disabled={personSaving || !personForm.name.trim()}
                      onClick={() => void submitPerson()}
                    >
                      {personSaving
                        ? "Saving…"
                        : personFormMode === "create"
                          ? "Create"
                          : "Save"}
                    </button>
                    <button
                      className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                      disabled={personSaving}
                      onClick={startCreatePerson}
                    >
                      {personFormMode === "create" ? "Clear" : "New"}
                    </button>
                  </div>
                  {personFormMode === "edit" ? (
                    <button
                      className="w-full rounded-md border border-destructive text-destructive px-3 py-2 text-sm hover:bg-destructive/10 disabled:opacity-50"
                      disabled={personSaving}
                      onClick={() => void removePerson()}
                    >
                      Delete Person
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium">Add Relation</div>
              <div className="mt-3 space-y-3">
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    Person A
                  </label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {relationForm.fromId
                          ? persons.find((p) => p.id === relationForm.fromId)
                              ?.name
                          : "Select person"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="w-full p-0"
                    >
                      <Command>
                        <CommandInput placeholder="Search person..." />
                        <CommandEmpty>No person found.</CommandEmpty>

                        <CommandGroup>
                          {persons
                            .filter((p) => p.id != null)
                            .map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.name ?? String(p.id)}
                                onSelect={() =>
                                  setRelationForm((s) => ({
                                    ...s,
                                    fromId: p.id!,
                                  }))
                                }
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    relationForm.fromId === p.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {p.name ?? `Person ${p.id}`}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    Person B(s) - Select multiple
                  </label>

                  {/* Selected Chips */}
                  {relationForm.toIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {relationForm.toIds.map((toId) => {
                        const person = persons.find((p) => p.id === toId);
                        return (
                          <div
                            key={toId}
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm border border-primary/20"
                          >
                            <span>{person?.name ?? `Person ${toId}`}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setRelationForm((s) => ({
                                  ...s,
                                  toIds: s.toIds.filter((id) => id !== toId),
                                }))
                              }
                              className="text-primary/60 hover:text-primary ml-1 font-semibold"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {relationForm.toIds.length > 0
                          ? `${relationForm.toIds.length} person${relationForm.toIds.length > 1 ? "s" : ""} selected`
                          : "Select person(s)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      className="w-full p-0"
                    >
                      <Command>
                        <CommandInput placeholder="Search person..." />
                        <CommandEmpty>No person found.</CommandEmpty>

                        <CommandGroup>
                          {persons
                            .filter(
                              (p) =>
                                p.id != null && p.id !== relationForm.fromId,
                            )
                            .map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.name ?? String(p.id)}
                                onSelect={() => {
                                  setRelationForm((s) => {
                                    const isSelected = s.toIds.includes(p.id!);
                                    return {
                                      ...s,
                                      toIds: isSelected
                                        ? s.toIds.filter((id) => id !== p.id!)
                                        : [...s.toIds, p.id!],
                                    };
                                  });
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    relationForm.toIds.includes(p.id!)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {p.name ?? `Person ${p.id}`}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    Relation Type
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={relationForm.relationType}
                    onChange={(e) =>
                      setRelationForm((s) => ({
                        ...s,
                        relationType: e.target.value as RelationType,
                      }))
                    }
                  >
                    {relationTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {relationSaveError ? (
                  <div className="text-sm text-destructive">
                    {relationSaveError}
                  </div>
                ) : null}

                <button
                  className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                  disabled={relationSaving}
                  onClick={() => void submitRelation()}
                >
                  {relationSaving ? "Creating…" : "Create Relation"}
                </button>
              </div>
            </div>

            {/* Family Management Section */}
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium">Families</div>
              <div className="mt-2 text-xs text-muted-foreground">
                View and manage your family groups
              </div>

              <div className="mt-3 space-y-3">
                {/* Family List */}
                <div className="space-y-2">
                  {familyLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading families...
                    </div>
                  ) : familyError ? (
                    <div className="text-sm text-destructive">
                      {familyError}
                    </div>
                  ) : families.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No families yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {families.map((family) => (
                        <div
                          key={family.id}
                          className="flex items-center justify-between rounded-md border bg-background p-2"
                        >
                          <span className="text-sm">{family.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ID: {family.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create Family Form */}
                <div className="grid gap-2">
                  <label className="text-xs text-muted-foreground">
                    Create New Family
                  </label>
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Family name..."
                    value={familyForm.familyName}
                    onChange={(e) =>
                      setFamilyForm((s) => ({
                        ...s,
                        familyName: e.target.value,
                      }))
                    }
                  />
                  {familySaveError ? (
                    <div className="text-sm text-destructive">
                      {familySaveError}
                    </div>
                  ) : null}
                  <button
                    className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                    disabled={familySaving}
                    onClick={() => void submitFamily()}
                  >
                    {familySaving ? "Creating…" : "Create Family"}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm font-medium">Relationship decoder</div>
              <div className="mt-2 text-xs text-muted-foreground">
                Select Person A and Person B from the dropdowns to decode their
                relationship.
              </div>

              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                      Person A
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {selectedA
                            ? persons.find((p) => String(p.id) === selectedA)
                                ?.name
                            : "Select person"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="w-full p-0"
                      >
                        <Command>
                          <CommandInput placeholder="Search person..." />
                          <CommandEmpty>No person found.</CommandEmpty>

                          <CommandGroup>
                            {persons
                              .filter((p) => p.id != null)
                              .map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name ?? String(p.id)}
                                  onSelect={() => setSelectedA(String(p.id))}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedA === String(p.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {p.name ?? `Person ${p.id}`}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">
                      Person B
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {selectedB
                            ? persons.find((p) => String(p.id) === selectedB)
                                ?.name
                            : "Select person"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>

                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        className="w-full p-0"
                      >
                        <Command>
                          <CommandInput placeholder="Search person..." />
                          <CommandEmpty>No person found.</CommandEmpty>

                          <CommandGroup>
                            {persons
                              .filter((p) => p.id != null)
                              .map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name ?? String(p.id)}
                                  onSelect={() => setSelectedB(String(p.id))}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedB === String(p.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {p.name ?? `Person ${p.id}`}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">
                    Language
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={decoderLang}
                    onChange={(e) => setDecoderLang(e.target.value)}
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm disabled:opacity-50"
                  disabled={decoderLoading}
                  onClick={() => void decode()}
                >
                  {decoderLoading ? "Decoding…" : "Decode"}
                </button>

                {decoderError ? (
                  <div className="text-sm text-destructive">{decoderError}</div>
                ) : null}
                {decoderResult ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm">
                    {decoderResult}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          transition={Zoom}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable={true}
          pauseOnHover
          theme="light"
          className="toast-container"
          toastClassName="toast-item"
        />
      </div>
    </div>
  );
}
