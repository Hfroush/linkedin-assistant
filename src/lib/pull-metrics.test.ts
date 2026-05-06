import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures these variables are available when vi.mock factories run
const {
  mockActorCall,
  mockActor,
  mockListItems,
  mockDataset,
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockUpdate,
  mockSet,
} = vi.hoisted(() => {
  const mockActorCall = vi.fn();
  const mockListItems = vi.fn();
  return {
    mockActorCall,
    mockActor: vi.fn(() => ({ call: mockActorCall })),
    mockListItems,
    mockDataset: vi.fn(() => ({ listItems: mockListItems })),
    mockSelect: vi.fn(),
    mockFrom: vi.fn(),
    mockWhere: vi.fn(),
    mockLimit: vi.fn(),
    mockUpdate: vi.fn(),
    mockSet: vi.fn(),
  };
});

// ---- Mock apify-client ----
vi.mock("apify-client", () => ({
  ApifyClient: vi.fn().mockImplementation(() => ({
    actor: mockActor,
    dataset: mockDataset,
  })),
}));

// ---- Mock the db client ----
vi.mock("@/db/client", () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

// ---- Import pullMetrics AFTER mocks ----
import { pullMetrics } from "@/app/actions/pull-metrics";

// ---- Helper: set up a default valid Apify response ----
function setupApifySuccess(stats = { total_reactions: 42, comments: 5, reposts: 3 }) {
  mockActorCall.mockResolvedValueOnce({
    status: "SUCCEEDED",
    defaultDatasetId: "dataset-123",
  });
  mockListItems.mockResolvedValueOnce({
    items: [{ stats }],
  });
}

// ---- Helper: set up db.select chain ----
function setupDbSelect(row: Record<string, unknown> | null) {
  const rows = row ? [row] : [];
  mockLimit.mockResolvedValueOnce(rows);
  mockWhere.mockReturnValueOnce({ limit: mockLimit });
  mockFrom.mockReturnValueOnce({ where: mockWhere });
  mockSelect.mockReturnValueOnce({ from: mockFrom });
}

// ---- Helper: set up db.update chain ----
function setupDbUpdate() {
  mockWhere.mockReturnValueOnce(Promise.resolve());
  mockSet.mockReturnValueOnce({ where: mockWhere });
  mockUpdate.mockReturnValueOnce({ set: mockSet });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("pullMetrics", () => {
  it("Test 1: returns success with correct fields when Apify returns valid stats", async () => {
    // DB: post is published, has a linkedinPostUrl, and has impressions
    setupDbSelect({
      status: "published",
      linkedinPostUrl: "https://linkedin.com/posts/test",
      impressions: 100,
    });
    // Apify: valid stats
    setupApifySuccess({ total_reactions: 42, comments: 5, reposts: 3 });
    // DB update succeeds
    setupDbUpdate();

    const result = await pullMetrics({ postId: "post-1" });

    expect(result).toEqual({
      success: true,
      reactions: 42,
      comments: 5,
      reposts: 3,
      engagementRate: 0.5, // (42+5+3)/100
    });
  });

  it("Test 2: returns { success: false, error: 'no_url' } when post has no linkedinPostUrl", async () => {
    // DB: post is published but linkedinPostUrl is null
    setupDbSelect({
      status: "published",
      linkedinPostUrl: null,
      impressions: 100,
    });

    const result = await pullMetrics({ postId: "post-2" });

    expect(result).toEqual({ success: false, error: "no_url" });
    // Apify must NOT have been called
    expect(mockActorCall).not.toHaveBeenCalled();
  });

  it("Test 3: returns { success: false, error: 'no_data' } when Apify items array is empty", async () => {
    setupDbSelect({
      status: "published",
      linkedinPostUrl: "https://linkedin.com/posts/test",
      impressions: 100,
    });
    // Apify: SUCCEEDED but empty items
    mockActorCall.mockResolvedValueOnce({
      status: "SUCCEEDED",
      defaultDatasetId: "dataset-empty",
    });
    mockListItems.mockResolvedValueOnce({ items: [] });

    const result = await pullMetrics({ postId: "post-3" });

    expect(result).toEqual({ success: false, error: "no_data" });
    // DB must NOT have been updated
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("Test 4: does NOT write impressions to DB when updating metrics", async () => {
    setupDbSelect({
      status: "published",
      linkedinPostUrl: "https://linkedin.com/posts/test",
      impressions: 200,
    });
    setupApifySuccess({ total_reactions: 10, comments: 2, reposts: 1 });
    setupDbUpdate();

    await pullMetrics({ postId: "post-4" });

    // Capture the payload passed to db.update().set(...)
    expect(mockSet).toHaveBeenCalledOnce();
    const payload = mockSet.mock.calls[0][0];
    expect(payload).not.toHaveProperty("impressions");
  });

  it("Test 5: sets engagementRate to null when impressions is null", async () => {
    setupDbSelect({
      status: "published",
      linkedinPostUrl: "https://linkedin.com/posts/test",
      impressions: null, // no impressions on record
    });
    setupApifySuccess({ total_reactions: 10, comments: 2, reposts: 1 });
    setupDbUpdate();

    const result = await pullMetrics({ postId: "post-5" });

    expect(result).toMatchObject({ success: true, engagementRate: null });
    // Also verify the DB write does NOT include engagementRate
    expect(mockSet).toHaveBeenCalledOnce();
    const payload = mockSet.mock.calls[0][0];
    expect(payload).not.toHaveProperty("engagementRate");
  });
});
