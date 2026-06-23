import {HttpsError, onCall} from "firebase-functions/v2/https";
import {admin, db} from "../core/firebase";

type DashboardGroupLayoutEntry = {
  id: string;
  title: string;
  parentGroupId: string;
  order: number;
  collapsed: boolean;
};

const normalizeDashboardGroupLayoutInput = (
  rawGroups: unknown,
  rawPlacements: unknown,
) => {
  if (!Array.isArray(rawGroups) || rawGroups.length > 500) {
    throw new HttpsError("invalid-argument", "invalid-groups");
  }
  const groups: DashboardGroupLayoutEntry[] = rawGroups.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpsError("invalid-argument", "invalid-group");
    }
    const raw = value as Record<string, unknown>;
    const id = (raw.id || "").toString().trim().slice(0, 128);
    const title = (raw.title || "Grupo").toString().trim().slice(0, 40);
    const parentGroupId = (raw.parentGroupId || "")
      .toString()
      .trim()
      .slice(0, 128);
    const rawOrder = Number(raw.order);
    if (!id || !Number.isFinite(rawOrder)) {
      throw new HttpsError("invalid-argument", "invalid-group");
    }
    return {
      id,
      title: title || "Grupo",
      parentGroupId,
      order: rawOrder,
      collapsed: raw.collapsed === true,
    };
  });
  const groupById = new Map(groups.map((group) => [group.id, group]));
  if (groupById.size !== groups.length) {
    throw new HttpsError("invalid-argument", "duplicate-group-id");
  }
  groups.forEach((group) => {
    const seen = new Set([group.id]);
    let parentGroupId = group.parentGroupId;
    let depth = 0;
    while (parentGroupId) {
      if (seen.has(parentGroupId)) {
        throw new HttpsError("invalid-argument", "group-cycle");
      }
      const parent = groupById.get(parentGroupId);
      if (!parent) {
        throw new HttpsError("invalid-argument", "missing-parent-group");
      }
      seen.add(parentGroupId);
      depth += 1;
      if (depth > 2) {
        throw new HttpsError("invalid-argument", "group-depth-exceeded");
      }
      parentGroupId = parent.parentGroupId;
    }
  });

  if (
    !rawPlacements ||
    typeof rawPlacements !== "object" ||
    Array.isArray(rawPlacements)
  ) {
    throw new HttpsError("invalid-argument", "invalid-placements");
  }
  const placementEntries = Object.entries(
    rawPlacements as Record<string, unknown>,
  );
  if (placementEntries.length > 5000) {
    throw new HttpsError("invalid-argument", "invalid-placements");
  }
  const placements = Object.fromEntries(placementEntries.map(([id, value]) => {
    if (!id || !value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpsError("invalid-argument", "invalid-placement");
    }
    const raw = value as Record<string, unknown>;
    const groupId = (raw.groupId || "").toString().trim().slice(0, 128);
    const order = Number(raw.order);
    if ((groupId && !groupById.has(groupId)) || !Number.isFinite(order)) {
      throw new HttpsError("invalid-argument", "invalid-placement");
    }
    return [id.slice(0, 128), {groupId, order}];
  }));
  return {groups, placements};
};

export const saveDashboardGroupLayout = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "auth-required");
  const layout = normalizeDashboardGroupLayoutInput(
    request.data?.groups,
    request.data?.placements,
  );
  await db.collection("dashboard_layout").doc(auth.uid).set(
    {
      ...layout,
      groupLayoutVersion: 2,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
    },
    {merge: true},
  );
  return {ok: true, groupLayoutVersion: 2};
});
