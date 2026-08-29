import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setLogLevel as setFirestoreLogLevel,
  setDoc,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import {
  deleteObject,
  getBytes,
  ref,
  uploadBytes
} from "firebase/storage";

setFirestoreLogLevel("silent");

const PROJECT_ID = "demo-unatomo-rules";
const OWNER_UID = "owner-user";
const ADMIN_UID = "admin-user";
const OUTSIDER_UID = "outsider-user";
const MACHINE_ID = "machine-1";
const ADMIN_LINK_ID = `${MACHINE_ID}_${ADMIN_UID}`;

const firestoreRules = await readFile("firebase/firestore.rules", "utf8");
const storageRules = await readFile("firebase/storage.rules", "utf8");
let env;

const auth = (uid, token = {}) => env.authenticatedContext(uid, token);
const db = (uid, token = {}) => auth(uid, token).firestore();
const bucket = (uid, token = {}) => auth(uid, token).storage();
const anonymousDb = () => env.unauthenticatedContext().firestore();
const anonymousBucket = () => env.unauthenticatedContext().storage();

async function seedFirestore() {
  await env.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await Promise.all([
      setDoc(doc(adminDb, "users", OWNER_UID), {
        company: "Owner company",
        displayName: "Owner"
      }),
      setDoc(doc(adminDb, "machines", MACHINE_ID), {
        ownerUid: OWNER_UID,
        title: "Washer",
        status: "operativa"
      }),
      setDoc(doc(adminDb, "admin_machine_links", ADMIN_LINK_ID), {
        ownerUid: OWNER_UID,
        adminUid: ADMIN_UID,
        status: "accepted"
      }),
      setDoc(doc(adminDb, "machine_access", "tag-1"), {
        tenantId: OWNER_UID,
        machineId: MACHINE_ID
      }),
      setDoc(doc(adminDb, "public_metrics", "nfc"), {
        machineCount: 1
      }),
      setDoc(doc(adminDb, "public_metrics", "private"), {
        internal: true
      }),
      setDoc(doc(adminDb, "agregador_maquinaria_LS", "legacy-machine"), {
        title: "Public legacy machine"
      }),
      setDoc(doc(adminDb, "laundry_public_catalog", "meta"), {
        type: "meta",
        version: 1,
        updatedAt: "2026-08-28",
        activeManufacturerIds: ["test"],
        publishedAt: Timestamp.now(),
        publishedBy: "laundry-admin"
      }),
      setDoc(doc(adminDb, "laundry_public_catalog", "manufacturer_test"), {
        type: "manufacturer",
        manufacturer: {id: "test", name: "Test"},
        modelGroups: [],
        spareParts: [],
        publishedAt: Timestamp.now(),
        publishedBy: "laundry-admin"
      }),
      setDoc(doc(adminDb, "registration_codes", "secret-code"), {
        active: true
      }),
      setDoc(doc(adminDb, "user_notifications", "owner-notification"), {
        recipientUid: OWNER_UID,
        type: "admin_left_machine",
        readAt: null,
        createdAt: Timestamp.now()
      })
    ]);
  });
}

async function seedStorage() {
  await env.withSecurityRulesDisabled(async (context) => {
    await Promise.all([
      uploadBytes(
        ref(context.storage(), "maquinaria/legacy-machine/photo.webp"),
        new Uint8Array([1, 2, 3]),
        { contentType: "image/webp" }
      ),
      uploadBytes(
        ref(context.storage(), `machine-docs/${OWNER_UID}/${MACHINE_ID}/manual/manual.pdf`),
        new Uint8Array([37, 80, 68, 70]),
        { contentType: "application/pdf" }
      )
    ]);
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: firestoreRules },
    storage: { rules: storageRules }
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await seedFirestore();
  await seedStorage();
});

after(async () => {
  await env.cleanup();
});

describe("Firestore rules", () => {
  test("publish only the NFC aggregate document", async () => {
    await assertSucceeds(getDoc(doc(anonymousDb(), "public_metrics", "nfc")));
    await assertFails(getDoc(doc(anonymousDb(), "public_metrics", "private")));
    await assertFails(getDocs(collection(anonymousDb(), "public_metrics")));
    await assertFails(setDoc(doc(anonymousDb(), "public_metrics", "nfc"), { machineCount: 2 }));
  });

  test("keep account profiles private and restrict self-service fields", async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_UID), "users", OWNER_UID)));
    await assertFails(getDoc(doc(db(OUTSIDER_UID), "users", OWNER_UID)));
    await assertSucceeds(updateDoc(doc(db(OWNER_UID), "users", OWNER_UID), {
      company: "Updated company",
      updatedAt: Timestamp.now()
    }));
    await assertFails(updateDoc(doc(db(OWNER_UID), "users", OWNER_UID), {
      suggestionsCollaborator: true
    }));
    await assertFails(setDoc(doc(db(OWNER_UID), "users", "new-user"), {
      company: "Forbidden direct creation"
    }));
  });

  test("validate notification preferences and isolate them by account", async () => {
    const preference = {
      schemaVersion: 2,
      updatedAt: Timestamp.now(),
      email: {
        enabled: true,
        receiveOwnedMachines: true,
        notifyAdministrators: false,
        receiveAdministeredMachines: true,
        events: {
          machineOutOfService: true,
          machineOperationalAgain: true
        }
      }
    };
    await assertSucceeds(setDoc(
      doc(db(OWNER_UID), "user_notification_preferences", OWNER_UID),
      preference
    ));
    await assertFails(setDoc(
      doc(db(OUTSIDER_UID), "user_notification_preferences", OWNER_UID),
      preference
    ));
    await assertFails(setDoc(
      doc(db(OWNER_UID), "user_notification_preferences", OWNER_UID),
      { ...preference, serverControlled: true }
    ));
    await assertFails(getDocs(collection(db(OWNER_UID), "user_notification_preferences")));
    await assertFails(deleteDoc(doc(db(OWNER_UID), "user_notification_preferences", OWNER_UID)));
  });

  test("isolate inbox notifications and allow only read state updates", async () => {
    const notification = doc(
      db(OWNER_UID),
      "user_notifications",
      "owner-notification"
    );
    await assertSucceeds(getDoc(notification));
    await assertFails(getDoc(doc(
      db(OUTSIDER_UID),
      "user_notifications",
      "owner-notification"
    )));
    await assertSucceeds(updateDoc(notification, {readAt: Timestamp.now()}));
    await assertFails(updateDoc(notification, {type: "tampered"}));
    await assertFails(setDoc(doc(
      db(OWNER_UID),
      "user_notifications",
      "client-created"
    ), {
      recipientUid: OWNER_UID,
      type: "admin_left_machine",
      readAt: null,
      createdAt: Timestamp.now()
    }));
    await assertFails(deleteDoc(notification));
  });

  test("allow machine access only to owner and accepted administrator", async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_UID), "machines", MACHINE_ID)));
    await assertSucceeds(getDoc(doc(db(ADMIN_UID), "machines", MACHINE_ID)));
    await assertFails(getDoc(doc(db(OUTSIDER_UID), "machines", MACHINE_ID)));
    await assertFails(getDoc(doc(anonymousDb(), "machines", MACHINE_ID)));

    await assertSucceeds(updateDoc(doc(db(ADMIN_UID), "machines", MACHINE_ID), {
      title: "Updated by admin"
    }));
    await assertFails(updateDoc(doc(db(ADMIN_UID), "machines", MACHINE_ID), {
      status: "fuera_de_servicio"
    }));
    await assertFails(deleteDoc(doc(db(ADMIN_UID), "machines", MACHINE_ID)));
    await assertSucceeds(deleteDoc(doc(db(OWNER_UID), "machines", MACHINE_ID)));
  });

  test("reject pending administrators and direct machine creation", async () => {
    await env.withSecurityRulesDisabled((context) => updateDoc(
      doc(context.firestore(), "admin_machine_links", ADMIN_LINK_ID),
      { status: "pending" }
    ));
    await assertFails(getDoc(doc(db(ADMIN_UID), "machines", MACHINE_ID)));
    await assertFails(setDoc(doc(db(OWNER_UID), "machines", "direct-machine"), {
      ownerUid: OWNER_UID,
      title: "Direct"
    }));
  });

  test("protect QR access records and server-only collections", async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_UID), "machine_access", "tag-1")));
    await assertSucceeds(getDoc(doc(db(ADMIN_UID), "machine_access", "tag-1")));
    await assertFails(getDoc(doc(db(OUTSIDER_UID), "machine_access", "tag-1")));
    await assertFails(getDocs(collection(db(OWNER_UID), "machine_access")));
    await assertFails(getDoc(doc(db(OWNER_UID), "registration_codes", "secret-code")));
    await assertFails(setDoc(doc(db(OWNER_UID), "machine_access_sessions", "session"), {
      active: true
    }));
  });

  test("preserve the explicit public legacy read and privileged write", async () => {
    await assertSucceeds(getDoc(doc(anonymousDb(), "agregador_maquinaria_LS", "legacy-machine")));
    await assertFails(updateDoc(
      doc(db(OUTSIDER_UID, { laundryServicesAdmin: false }), "agregador_maquinaria_LS", "legacy-machine"),
      { title: "Forbidden" }
    ));
    await assertSucceeds(updateDoc(
      doc(db("laundry-admin", { laundryServicesAdmin: true }), "agregador_maquinaria_LS", "legacy-machine"),
      { title: "Allowed" }
    ));
    await assertFails(deleteDoc(
      doc(db("laundry-admin", { laundryServicesAdmin: true }), "agregador_maquinaria_LS", "legacy-machine")
    ));
  });

  test("expose only the published laundry catalogue and restrict its writes", async () => {
    const publicCatalog = doc(anonymousDb(), "laundry_public_catalog", "meta");
    await assertSucceeds(getDoc(publicCatalog));
    await assertSucceeds(getDocs(collection(anonymousDb(), "laundry_public_catalog")));
    await assertFails(updateDoc(
      doc(db(OUTSIDER_UID, { laundryServicesAdmin: false }), "laundry_public_catalog", "meta"),
      { updatedAt: "forbidden" }
    ));
    await assertSucceeds(updateDoc(
      doc(db("laundry-admin", { laundryServicesAdmin: true }), "laundry_public_catalog", "meta"),
      { updatedAt: "2026-08-29" }
    ));
    await assertFails(setDoc(
      doc(db("laundry-admin", { laundryServicesAdmin: true }), "laundry_public_catalog", "categories"),
      {
        type: "manufacturer",
        publishedAt: Timestamp.now(),
        publishedBy: "laundry-admin"
      }
    ));
    await assertFails(deleteDoc(
      doc(db("laundry-admin", { laundryServicesAdmin: true }), "laundry_public_catalog", "meta")
    ));
  });
});

describe("Storage rules", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  test("isolate profile avatars and enforce WebP", async () => {
    const ownAvatar = ref(bucket(OWNER_UID), `profile-avatars/${OWNER_UID}/avatar.webp`);
    await assertSucceeds(uploadBytes(ownAvatar, bytes, { contentType: "image/webp" }));
    await assertSucceeds(getBytes(ownAvatar));
    await assertFails(getBytes(ref(bucket(OUTSIDER_UID), `profile-avatars/${OWNER_UID}/avatar.webp`)));
    await assertFails(uploadBytes(
      ref(bucket(OWNER_UID), `profile-avatars/${OWNER_UID}/avatar.webp`),
      bytes,
      { contentType: "image/png" }
    ));
  });

  test("allow owners and accepted administrators to manage valid machine documents", async () => {
    const ownerPlate = ref(bucket(OWNER_UID), `machine-docs/${OWNER_UID}/${MACHINE_ID}/plate/plate.webp`);
    const adminOther = ref(bucket(ADMIN_UID), `machine-docs/${OWNER_UID}/${MACHINE_ID}/other/report.pdf`);
    await assertSucceeds(uploadBytes(ownerPlate, bytes, { contentType: "image/webp" }));
    await assertSucceeds(uploadBytes(adminOther, bytes, { contentType: "application/pdf" }));
    await assertSucceeds(getBytes(ref(
      bucket(ADMIN_UID),
      `machine-docs/${OWNER_UID}/${MACHINE_ID}/manual/manual.pdf`
    )));
    await assertSucceeds(deleteObject(adminOther));
  });

  test("reject outsiders, invalid document types and unknown paths", async () => {
    const path = `machine-docs/${OWNER_UID}/${MACHINE_ID}/manual/manual.pdf`;
    await assertFails(getBytes(ref(bucket(OUTSIDER_UID), path)));
    await assertFails(uploadBytes(
      ref(bucket(OWNER_UID), `machine-docs/${OWNER_UID}/${MACHINE_ID}/manual/not-a-pdf.png`),
      bytes,
      { contentType: "image/png" }
    ));
    await assertFails(uploadBytes(
      ref(bucket(OWNER_UID), "unexpected/private.txt"),
      bytes,
      { contentType: "text/plain" }
    ));
  });

  test("preserve public machinery images and restrict their management", async () => {
    const legacyPath = "maquinaria/legacy-machine/photo.webp";
    await assertSucceeds(getBytes(ref(anonymousBucket(), legacyPath)));
    await assertFails(uploadBytes(
      ref(bucket(OUTSIDER_UID, { laundryServicesAdmin: false }), legacyPath),
      bytes,
      { contentType: "image/webp" }
    ));
    await assertSucceeds(uploadBytes(
      ref(bucket("laundry-admin", { laundryServicesAdmin: true }), legacyPath),
      bytes,
      { contentType: "image/webp" }
    ));
    await assertFails(deleteObject(
      ref(bucket(OUTSIDER_UID, { laundryServicesAdmin: false }), legacyPath)
    ));
    await assertSucceeds(deleteObject(
      ref(bucket("laundry-admin", { laundryServicesAdmin: true }), legacyPath)
    ));
  });
});

test("rules test environment initialized", () => {
  assert.ok(env);
});
