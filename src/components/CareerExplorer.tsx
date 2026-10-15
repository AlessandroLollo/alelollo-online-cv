import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Bookmark,
  Braces,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  Database,
  ExternalLink,
  FileCode2,
  FolderKanban,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  ListFilter,
  Mail,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Table2,
  Users,
  X,
} from "lucide-react";
import type { Career, CareerRecord, SavedView } from "../lib/career";
import { Button, buttonVariants } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { cn } from "../lib/utils";

type View =
  | "overview"
  | "experience"
  | "projects"
  | "skills"
  | "opensource"
  | "education"
  | "search"
  | SavedView;
type Props = { career: Career; base: string; pdfUrl: string };
const tables = [
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "skills", label: "Skills", icon: Braces },
  { id: "opensource", label: "Open source", icon: GitBranch },
  { id: "education", label: "Education", icon: GraduationCap },
] as const;
const lenses = [
  {
    id: "engineering",
    label: "Engineering",
    description: "Architecture, pipelines & tooling",
    icon: Braces,
  },
  {
    id: "leadership",
    label: "Leadership",
    description: "Teams, strategy & collaboration",
    icon: Users,
  },
  {
    id: "business-impact",
    label: "Business impact",
    description: "Trusted data & analytics adoption",
    icon: Sparkles,
  },
] as const;
const viewLabels: Record<View, string> = {
  overview: "Overview",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  opensource: "Open source",
  education: "Education",
  search: "Search results",
  engineering: "Engineering",
  leadership: "Leadership",
  "business-impact": "Business impact",
};
const isLens = (view: View): view is SavedView =>
  lenses.some((lens) => lens.id === view);

export default function CareerExplorer({ career, base, pdfUrl }: Props) {
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("all");
  const [capability, setCapability] = useState<string | null>(null);
  const [record, setRecord] = useState<CareerRecord | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [theme, setTheme] = useState("light");
  const lastTrigger = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const printUrl = `${base}print/`;

  useEffect(() => {
    function syncLocation() {
      const [name, marker, id] = window.location.hash.slice(1).split("/");
      const nextView =
        name && Object.hasOwn(viewLabels, name) ? (name as View) : "overview";
      setView(nextView);
      if (nextView !== "search") setCapability(null);
      setRecord(
        marker === "record"
          ? career.records.find((item) => item.id === id) || null
          : null,
      );
    }
    syncLocation();
    setTheme(document.documentElement.dataset.theme || "light");
    window.addEventListener("hashchange", syncLocation);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("keydown", shortcut);
    };
  }, [career.records]);

  useEffect(() => {
    document.title = `Alessandro Lollo · ${viewLabels[view]}`;
  }, [view]);

  function navigate(next: View) {
    setView(next);
    setRecord(null);
    setQuery("");
    setFocus("all");
    setCapability(null);
    setSorting([]);
    window.location.hash = next;
    if (menu.current) menu.current.open = false;
  }
  function openRecord(item: CareerRecord, event?: MouseEvent<HTMLElement>) {
    event?.preventDefault();
    lastTrigger.current =
      event?.currentTarget || (document.activeElement as HTMLElement);
    setRecord(item);
    window.location.hash = `${view}/record/${item.id}`;
  }
  function closeRecord() {
    setRecord(null);
    window.location.hash = view;
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("career-theme", next);
    } catch {
      /* Theme still works when storage is unavailable. */
    }
  }

  const evidence = capability
    ? career.capabilities.find((skill) => skill.id === capability)
    : null;
  const dataset = useMemo(() => {
    if (evidence)
      return career.records.filter((item) =>
        evidence.recordIds.includes(item.id),
      );
    if (isLens(view))
      return career.records.filter((item) => item.views.includes(view));
    if (view === "projects") return career.projects;
    if (view === "opensource") return career.contributions;
    if (view === "search") return career.records;
    return career.experience;
  }, [view, evidence, career]);
  const focusOptions = [...new Set(dataset.map((item) => item.focus))];
  const filtered = useMemo(() => {
    const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return dataset.filter((item) => {
      const searchable = [
        item.company,
        item.role,
        item.period,
        item.focus,
        item.outcome,
        ...item.keywords,
        item.html.replace(/<[^>]*>/g, " "),
        ...Object.values(item.caseStudy || {}),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        (focus === "all" || item.focus === focus) &&
        terms.every((term) => searchable.includes(term))
      );
    });
  }, [dataset, query, focus]);
  const columns = useMemo<ColumnDef<CareerRecord>[]>(
    () => [
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <div className="company-cell">
            <span
              className={`company-mark mark-${row.original.id.slice(0, 2)}`}
              aria-hidden="true"
            >
              {row.original.company.slice(0, 2).toUpperCase()}
            </span>
            <span>
              {row.original.company}
              <small>{row.original.kind}</small>
            </span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role / record",
        cell: ({ row }) => (
          <a
            className="record-link"
            href={`${printUrl}#${row.original.experienceId || row.original.id}`}
            onClick={(event) => openRecord(row.original, event)}
          >
            {row.original.role}
          </a>
        ),
      },
      {
        accessorKey: "period",
        header: "Period",
        cell: ({ getValue }) => (
          <span className="period">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "focus",
        header: "Focus",
        cell: ({ getValue }) => (
          <span className="focus-tag">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "outcome",
        header: "Selected outcome",
        cell: ({ getValue }) => (
          <span className="outcome-text">{getValue<string>()}</span>
        ),
      },
    ],
    [printUrl, view],
  );
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const tableName =
    view === "overview"
      ? "experience"
      : isLens(view) || view === "search"
        ? "records"
        : view === "opensource"
          ? "open_source"
          : view;
  const label = evidence ? `Evidence: ${evidence.name}` : viewLabels[view];
  const counts: Record<string, number> = {
    experience: career.experience.length,
    projects: career.projects.length,
    skills: career.capabilities.length,
    opensource: career.contributions.length,
    education: career.education.length,
  };

  function navigation(mobile = false) {
    return (
      <nav
        aria-label={mobile ? "Mobile career navigation" : "Career navigation"}
      >
        <a
          className={cn("nav-link", view === "overview" && "active")}
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            navigate("overview");
          }}
          aria-current={view === "overview" ? "page" : undefined}
        >
          <LayoutDashboard size={16} />
          Overview
        </a>
        <p className="nav-group-label">
          TABLES <span>{tables.length}</span>
        </p>
        <div className="schema-tree">
          <p>
            <ChevronDown size={12} />
            <Database size={13} /> career <span>public</span>
          </p>
          {tables.map((item) => (
            <a
              className={cn(
                "nav-link",
                view === item.id && !capability && "active",
              )}
              href={`#${item.id}`}
              key={item.id}
              aria-current={
                view === item.id && !capability ? "page" : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                navigate(item.id);
              }}
            >
              <item.icon size={15} />
              {item.label}
              <span className="nav-count">
                {String(counts[item.id]).padStart(2, "0")}
              </span>
            </a>
          ))}
        </div>
        <p className="nav-group-label">
          SAVED VIEWS <span>3</span>
        </p>
        {lenses.map((lens) => (
          <a
            key={lens.id}
            href={`#${lens.id}`}
            className={cn("nav-link saved-link", view === lens.id && "active")}
            aria-current={view === lens.id ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigate(lens.id);
            }}
          >
            <Bookmark size={14} />
            {lens.label}
            <ChevronRight className="nav-chevron" size={12} />
          </a>
        ))}
      </nav>
    );
  }

  return (
    <div className="career-app">
      <aside className="sidebar">
        <a className="workspace-brand" href={base}>
          <span className="brand-icon">
            <Database size={21} />
          </span>
          <span>
            alessandro_lollo<small>CAREER DATABASE</small>
          </span>
        </a>
        <div className="database-state">
          <span className="status-dot" />
          Public profile<span>READ ONLY</span>
        </div>
        {navigation()}
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <CircleHelp size={16} />
            <p>
              One career. Different perspectives.
              <br />
              <span>Start with a saved view.</span>
            </p>
          </div>
          <a href={`mailto:${career.profile.email}`} className="sidebar-person">
            <img src={`${base}profile.jpg`} alt="" width="34" height="34" />
            <span>
              {career.profile.name}
              <small>Data & Analytics Engineering</small>
            </span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="topbar">
          <details ref={menu} className="mobile-menu">
            <summary aria-label="Open career navigation">
              <Menu size={19} />
            </summary>
            <div>{navigation(true)}</div>
          </details>
          <div className="breadcrumbs">
            <Database size={14} />
            <span>career</span>
            <ChevronRight size={12} />
            <strong>{viewLabels[view]}</strong>
          </div>
          <label className="global-search">
            <Search size={15} />
            <span className="sr-only">Search all career records</span>
            <input
              ref={searchInput}
              value={query}
              onChange={(event) => {
                setFocus("all");
                setCapability(null);
                if (view !== "search") {
                  setView("search");
                  window.location.hash = "search";
                }
                setQuery(event.target.value);
              }}
              type="search"
              placeholder="Search this career…"
            />
            <kbd>
              <Command size={10} /> K
            </kbd>
          </label>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={pdfUrl}
              download="Alessandro-Lollo-CV.pdf"
            >
              <ArrowDownToLine size={14} />
              <span>Download CV</span>
            </a>
            <a
              href={`mailto:${career.profile.email}`}
              aria-label="Contact Alessandro by email"
              className={cn(buttonVariants({ size: "sm" }), "contact-link")}
            >
              <Mail size={14} />
              <span>Contact</span>
            </a>
          </div>
        </header>
        <main id="main" className="main-content" tabIndex={-1}>
          <section className="page-heading">
            <div>
              <p className="eyebrow">
                {view === "overview"
                  ? "THE PERSON BEHIND THE PIPELINES"
                  : isLens(view)
                    ? "SAVED VIEW / SAME CAREER, DIFFERENT PERSPECTIVE"
                    : `CAREER / ${tableName.toUpperCase()}`}
              </p>
              <h1>{view === "overview" ? career.profile.name : label}</h1>
              <p>
                {view === "overview"
                  ? "Data & Analytics Engineering · Architecture · Leadership"
                  : evidence?.description ||
                    (isLens(view)
                      ? lenses.find((lens) => lens.id === view)?.description
                      : "Explore the work. Follow the evidence.")}
              </p>
            </div>
            {view === "overview" && (
              <a
                className="current-role"
                href={`${printUrl}#${career.experience[0].id}`}
                onClick={(event) => openRecord(career.experience[0], event)}
              >
                <span className="status-dot" />
                <div>
                  <small>CURRENTLY</small>
                  {career.experience[0].role}
                  <span>
                    {career.experience[0].company} <ArrowUpRight size={12} />
                  </span>
                </div>
              </a>
            )}
          </section>

          {view === "overview" && (
            <>
              <section className="overview-intro">
                <div className="intro-copy">
                  <div className="intro-label">
                    <span className="status-dot" />
                    15+ YEARS IN DATA
                  </div>
                  <h2>
                    Engineering the platform.
                    <br />
                    <em>Growing the capability.</em>
                  </h2>
                  <p>
                    I build the foundations that make data useful — and the
                    teams that make them last.
                  </p>
                  <div className="intro-links">
                    <a
                      href="#engineering"
                      onClick={(event) => {
                        event.preventDefault();
                        navigate("engineering");
                      }}
                    >
                      Explore my work <ArrowRight size={15} />
                    </a>
                    <a
                      href={`https://www.linkedin.com/in/${career.profile.linkedin}/`}
                    >
                      LinkedIn <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
                <div className="selected-impact">
                  <p className="eyebrow">SELECTED EVIDENCE</p>
                  <button
                    onClick={(event) =>
                      openRecord(
                        career.experience.find((job) => job.id === "cuebiq")!,
                        event,
                      )
                    }
                  >
                    <span className="impact-icon">
                      <ShieldCheck size={19} />
                    </span>
                    <div>
                      <strong>150+ users</strong>
                      <p>Adopted the data catalog delivered at Cuebiq.</p>
                    </div>
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    onClick={(event) =>
                      openRecord(
                        career.experience.find(
                          (job) => job.id === "cloud-academy",
                        )!,
                        event,
                      )
                    }
                  >
                    <span className="impact-icon">
                      <Users size={19} />
                    </span>
                    <div>
                      <strong>People + platforms</strong>
                      <p>
                        Built Cloud Academy’s Data Engineering & Analytics team.
                      </p>
                    </div>
                    <ArrowUpRight size={14} />
                  </button>
                  <a
                    href="#opensource"
                    onClick={(event) => {
                      event.preventDefault();
                      navigate("opensource");
                    }}
                  >
                    <span className="impact-icon">
                      <GitBranch size={19} />
                    </span>
                    <div>
                      <strong>Open-source contributor</strong>
                      <p>
                        Prefect integrations for analytics and data quality.
                      </p>
                    </div>
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </section>
              <section
                className="perspectives"
                aria-label="Explore by perspective"
              >
                <div className="perspectives-label">
                  <Bookmark size={15} />
                  <span>CHOOSE A PERSPECTIVE</span>
                </div>
                {lenses.map((lens) => (
                  <a
                    key={lens.id}
                    href={`#${lens.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      navigate(lens.id);
                    }}
                  >
                    <lens.icon size={17} />
                    <span>
                      <strong>{lens.label}</strong>
                      <small>{lens.description}</small>
                    </span>
                    <ArrowRight size={14} />
                  </a>
                ))}
              </section>
            </>
          )}

          {view === "skills" ? (
            <>
              <section
                className="skills-grid"
                aria-label="Evidence-based capabilities"
              >
                {career.capabilities.map((skill) => (
                  <article key={skill.id}>
                    <span className="capability-icon">
                      <Braces size={20} />
                    </span>
                    <h2>{skill.name}</h2>
                    <p>{skill.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCapability(skill.id);
                        setView("search");
                        setQuery("");
                        setFocus("all");
                        window.location.hash = "search";
                      }}
                    >
                      {skill.recordIds.length} evidence records{" "}
                      <ArrowRight size={13} />
                    </Button>
                  </article>
                ))}
              </section>
              <section className="tool-inventory">
                <div className="section-title">
                  <Braces size={17} />
                  <h2>Technology inventory</h2>
                </div>
                <p className="section-description">
                  A toolkit across my career. Explore the evidence above for the
                  work behind each capability.
                </p>
                {career.tools.map((tool) => (
                  <div key={tool.category}>
                    <strong>{tool.category}</strong>
                    <p>{tool.tools}</p>
                  </div>
                ))}
              </section>
            </>
          ) : view === "education" ? (
            <section className="education-view">
              {career.education.map((item) => (
                <article className="education-card" key={item.degree}>
                  <GraduationCap size={26} />
                  <span className="eyebrow">EDUCATION</span>
                  <h2>{item.degree}</h2>
                  <p>{item.university}</p>
                  <span className="period">{item.time}</span>
                </article>
              ))}
              <div className="personal-details">
                <article>
                  <h2>Languages</h2>
                  {career.profile.languages.info.map((language) => (
                    <p key={language.idiom}>
                      {language.idiom}
                      <span>{language.level}</span>
                    </p>
                  ))}
                </article>
                <article>
                  <h2>Outside the workspace</h2>
                  {career.profile.interests.info.map((interest) => (
                    <p key={interest.item}>{interest.item}</p>
                  ))}
                </article>
              </div>
            </section>
          ) : (
            <>
              {view === "opensource" && (
                <p className="collection-intro">{career.ossIntro}</p>
              )}
              {view === "projects" && (
                <p className="collection-intro">
                  Selected initiatives, structured as problem → decision →
                  delivery → outcome. Each links back to the experience that
                  supports it.
                </p>
              )}
              <section
                className="results-panel"
                aria-label={
                  evidence
                    ? `${evidence.name} evidence`
                    : `${viewLabels[view]} records`
                }
              >
                <div className="results-title">
                  <span>
                    <Table2 size={16} />
                    <h2 ref={resultsHeading} tabIndex={-1}>
                      {view === "overview"
                        ? "Career experience"
                        : evidence
                          ? evidence.name
                          : `${viewLabels[view]} records`}
                    </h2>
                    <span className="count-pill">{dataset.length}</span>
                  </span>
                  <a href={printUrl}>
                    Readable résumé <ExternalLink size={12} />
                  </a>
                </div>
                <div className="query-strip">
                  <FileCode2 size={14} />
                  <code>
                    <span>SELECT</span> company, role, period, focus, outcome{" "}
                    <span>FROM</span> career.{tableName}
                    {isLens(view) ? (
                      <>
                        {" "}
                        <span>WHERE</span> perspective = '{viewLabels[view]}'
                      </>
                    ) : (
                      ""
                    )}
                    ;
                  </code>
                  <span className="query-label">
                    {isLens(view) ? "SAVED VIEW" : "READ ONLY"}
                  </span>
                </div>
                <div className="filters">
                  <label className="table-search">
                    <Search size={14} />
                    <span className="sr-only">Filter visible records</span>
                    <input
                      type="search"
                      placeholder="Filter records…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <label className="focus-filter">
                    <ListFilter size={14} />
                    <span className="sr-only">Filter by focus</span>
                    <select
                      value={focus}
                      onChange={(event) => setFocus(event.target.value)}
                    >
                      <option value="all">All focus areas</option>
                      {focusOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  {(query || focus !== "all" || evidence) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setFocus("all");
                        setCapability(null);
                      }}
                    >
                      Clear filters <X size={12} />
                    </Button>
                  )}
                  <span
                    className="result-total"
                    role="status"
                    aria-live="polite"
                  >
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "record" : "records"}
                  </span>
                </div>
                <div className="records-scroll">
                  <table className="records-table">
                    <caption className="sr-only">
                      {label}: select a record for context, delivery, and
                      outcomes
                    </caption>
                    <thead>
                      {table.getHeaderGroups().map((group) => (
                        <tr key={group.id}>
                          {group.headers.map((header) => (
                            <th
                              key={header.id}
                              scope="col"
                              aria-sort={
                                header.column.getIsSorted() === "asc"
                                  ? "ascending"
                                  : header.column.getIsSorted() === "desc"
                                    ? "descending"
                                    : "none"
                              }
                            >
                              <button
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {header.column.getIsSorted() === "asc" ? (
                                  <ArrowUp size={12} />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDown size={12} />
                                ) : (
                                  <ArrowUpDown size={11} />
                                )}
                              </button>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.original.id}
                          data-record={row.original.id}
                          onClick={(event) => {
                            if (!(event.target as Element).closest("a, button"))
                              openRecord(row.original, event);
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              data-label={
                                typeof cell.column.columnDef.header === "string"
                                  ? cell.column.columnDef.header
                                  : cell.column.id
                              }
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filtered.length && (
                  <div className="empty-state">
                    <Search size={24} />
                    <h3>No matching records</h3>
                    <p>Try another company, capability, or focus area.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery("");
                        setFocus("all");
                        setCapability(null);
                      }}
                    >
                      Reset filters
                    </Button>
                  </div>
                )}
                <div className="results-footer">
                  <span>
                    <Check size={12} />
                    Public career records
                  </span>
                  <span>
                    Select a role to explore its story{" "}
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </section>
            </>
          )}

          {view === "overview" && (
            <div className="profile-note">
              <p className="eyebrow">IN MY OWN WORDS</p>
              <div
                dangerouslySetInnerHTML={{ __html: career.profile.summaryHtml }}
              />
            </div>
          )}
          <footer className="workspace-footer">
            <span>Built on data. Grounded in people.</span>
            <div>
              <a href={`https://github.com/${career.profile.github}`}>
                <GitBranch size={13} />
                GitHub <ArrowUpRight size={11} />
              </a>
              <a
                href={`https://www.linkedin.com/in/${career.profile.linkedin}/`}
              >
                LinkedIn <ArrowUpRight size={11} />
              </a>
              <a href={`mailto:${career.profile.email}`}>
                Email <ArrowUpRight size={11} />
              </a>
            </div>
          </footer>
        </main>
        <div className="statusbar">
          <span>
            <Database size={11} />
            alessandro_lollo / career
          </span>
          <span>
            {career.records.length} public records <span>·</span>{" "}
            {career.profile.timezone}
          </span>
        </div>
      </div>
      <Sheet
        open={!!record}
        onOpenChange={(open) => {
          if (!open) closeRecord();
        }}
        title={record?.role || "Career record"}
        description={record ? `${record.company} · ${record.period}` : ""}
        onCloseFocus={() => {
          if (lastTrigger.current?.isConnected) lastTrigger.current.focus();
          else resultsHeading.current?.focus();
        }}
      >
        {record && (
          <>
            <div className="record-metadata">
              <span className="focus-tag">{record.focus}</span>
              <span>{record.kind}</span>
              <code>{record.id}</code>
            </div>
            <section className="record-outcome">
              <p className="eyebrow">
                {record.kind === "Skill"
                  ? "TECHNOLOGY INVENTORY"
                  : "SELECTED OUTCOME"}
              </p>
              <p>{record.outcome}</p>
            </section>
            {record.caseStudy ? (
              <div className="case-study">
                {(["problem", "decision", "delivery", "outcome"] as const).map(
                  (part, index) => (
                    <section key={part}>
                      <span className="case-number">0{index + 1}</span>
                      <div>
                        <h3>{part[0].toUpperCase() + part.slice(1)}</h3>
                        <p>{record.caseStudy![part]}</p>
                      </div>
                    </section>
                  ),
                )}
              </div>
            ) : record.html ? (
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: record.html }}
              />
            ) : (
              <p className="prose">{record.outcome}</p>
            )}
            {record.keywords.length > 0 && (
              <section className="record-keywords">
                <h3>Focus & capabilities</h3>
                <div>
                  {record.keywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </section>
            )}
            <div className="record-actions">
              {record.experienceId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const job = career.records.find(
                      (item) => item.id === record.experienceId,
                    );
                    if (job) openRecord(job);
                  }}
                >
                  View supporting experience <ArrowRight size={14} />
                </Button>
              )}
              {record.link && (
                <a
                  className={buttonVariants({ variant: "outline" })}
                  href={record.link}
                >
                  {record.kind === "Open source"
                    ? "View contribution"
                    : "Visit company"}
                  <ExternalLink size={14} />
                </a>
              )}
              <a href={`${printUrl}#${record.experienceId || record.id}`}>
                Read in full résumé <ArrowUpRight size={13} />
              </a>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
