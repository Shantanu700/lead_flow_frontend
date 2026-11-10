import * as React from "react"

import { ApiFailure } from "@/lib/api"
import { EMPTY_PAGE, SORT_KEY, type Sort, type Status } from "@/lib/leads"
import { getApiLeads } from "@/src/client/sdk.gen"
import type { PaginatedLead } from "@/src/client/types.gen"

/** The lead list's filter, search, sort and page, and the page of leads the
 *  server returned for them. */
export function useLeadList() {
  const [filter, setFilter] = React.useState<"All" | Status>("All")
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [sort, setSort] = React.useState<Sort>("Recent")
  const [list, setList] = React.useState<PaginatedLead>(EMPTY_PAGE)
  const listSeq = React.useRef(0)

  /** Fetch the lead page tab `v` shows. The server does all the filtering,
   *  searching and sorting: 5 rows on the Dashboard (status filter only),
   *  10 on Leads (filter, search, sort, page). */
  const fetchList = async (v: number) => {
    const seq = ++listSeq.current
    const { data, error, response } = await getApiLeads({
      query: {
        status: filter === "All" ? undefined : filter,
        ...(v === 1
          ? {
              q: q.trim() || undefined,
              ordering: SORT_KEY[sort],
              page: page + 1,
              page_size: 10,
            }
          : { page_size: 5 }),
      },
    })
    if (seq !== listSeq.current) return // a newer request superseded this one
    // The page ran off the end (e.g. after a status change): back to page 1.
    if (response?.status === 404 && page > 0) return setPage(0)
    if (error !== undefined || !data)
      throw new ApiFailure(error, response?.status)
    setList(data)
  }

  const pageCount = Math.max(1, Math.ceil(list.count / 10))
  const filterLabel = filter === "All" ? "All statuses" : filter

  return {
    filter,
    setFilter,
    q,
    setQ,
    page,
    setPage,
    sort,
    setSort,
    list,
    setList,
    fetchList,
    pageCount,
    filterLabel,
  }
}
