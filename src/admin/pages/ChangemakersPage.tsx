import { Link } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { Pagination } from "../components/Pagination";
import { ProfileStatusBadge, VerificationBadge } from "../components/StatusBadge";
import { formatDay } from "../lib/format";
import { useAdminData } from "../state/AdminDataContext";
import type { ProfileStatus, VerificationStatus } from "../types/admin";

const PAGE_SIZE = 20;

export function ChangemakersPage() {
  const { people, setVerificationStatus, setProfileStatus } = useAdminData();

  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<VerificationStatus | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | "all">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "joined">("joined");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const countries = useMemo(() => [...new Set(people.map((p) => p.country))].sort(), [people]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return people
      .filter((person) => {
        if (
          term &&
          !person.name.toLowerCase().includes(term) &&
          !person.organization.toLowerCase().includes(term)
        ) {
          return false;
        }
        if (verificationFilter !== "all" && person.admin.verificationStatus !== verificationFilter) return false;
        if (statusFilter !== "all" && person.admin.profileStatus !== statusFilter) return false;
        if (countryFilter !== "all" && person.country !== countryFilter) return false;
        return true;
      })
      .sort((a, b) =>
        sortKey === "name"
          ? a.name.localeCompare(b.name)
          : new Date(b.admin.joinedAt).getTime() - new Date(a.admin.joinedAt).getTime(),
      );
  }, [people, query, verificationFilter, statusFilter, countryFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((current) => {
      const allSelected = pageItems.length > 0 && pageItems.every((item) => current.has(item.id));
      const next = new Set(current);
      for (const item of pageItems) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  function bulkVerify() {
    selected.forEach((id) => setVerificationStatus(id, "verified"));
    setSelected(new Set());
  }

  function bulkArchive() {
    selected.forEach((id) => setProfileStatus(id, "archived"));
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Changemakers</h1>
        <p className="text-sm text-muted-foreground">Manage profiles across the global network.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-md border border-input bg-secondary/40 px-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or organization"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={verificationFilter}
          onChange={(event) => {
            setVerificationFilter(event.target.value as VerificationStatus | "all");
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-secondary/40 px-2 text-sm text-foreground"
        >
          <option value="all">All verification</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="needs_changes">Needs changes</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as ProfileStatus | "all");
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-secondary/40 px-2 text-sm text-foreground"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={countryFilter}
          onChange={(event) => {
            setCountryFilter(event.target.value);
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-secondary/40 px-2 text-sm text-foreground"
        >
          <option value="all">All countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as "name" | "joined")}
          className="h-9 rounded-md border border-input bg-secondary/40 px-2 text-sm text-foreground"
        >
          <option value="joined">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>

        <button className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
          <span className="text-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={bulkVerify}
              className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              Verify selected
            </button>
            <button
              onClick={bulkArchive}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              Archive selected
            </button>
          </div>
        </div>
      )}

      {pageItems.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No changemakers match these filters"
          description="Try clearing a filter or searching a different name."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="w-8 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && pageItems.every((item) => selected.has(item.id))}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-3 py-2.5 font-medium">Profile</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Organization</th>
                <th className="px-3 py-2.5 font-medium">Verification</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Joined</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageItems.map((person) => (
                <tr key={person.id} className="hover:bg-accent/40">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(person.id)}
                      onChange={() => toggleSelected(person.id)}
                      aria-label={`Select ${person.name}`}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to="/admin/changemakers/$id" params={{ id: person.id }} className="block">
                      <p className="font-medium text-foreground">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.category}</p>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {person.city}, {person.country}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{person.organization}</td>
                  <td className="px-3 py-2.5">
                    <VerificationBadge status={person.admin.verificationStatus} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ProfileStatusBadge status={person.admin.profileStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatDay(person.admin.joinedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Link to="/admin/changemakers/$id" params={{ id: person.id }} className="text-xs font-medium text-primary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-3 py-3">
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
