import "dotenv/config";
import { Client } from "@elastic/elasticsearch";

const ES_NODE = process.env.ELASTICSEARCH_URL || "http://localhost:9200";

export const esClient = new Client({ node: ES_NODE });

const EMAIL_INDEX = "emails";

let esAvailable = false;

export const initElasticsearch = async () => {
    try {
        await esClient.ping();
        esAvailable = true;
        console.log("[Elasticsearch] Connected ✅");

        // Create index if it doesn't exist
        const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
        if (!exists) {
            await esClient.indices.create({
                index: EMAIL_INDEX,
                mappings: {
                    properties: {
                        id: { type: "keyword" },
                        to: { type: "keyword" },
                        subject: { type: "text", analyzer: "standard" },
                        body: { type: "text", analyzer: "standard" },
                        status: { type: "keyword" },
                        senderEmail: { type: "keyword" },
                        scheduledAt: { type: "date" },
                        sentAt: { type: "date" },
                        createdAt: { type: "date" },
                    },
                },
            } as any);
            console.log("[Elasticsearch] Index 'emails' created ✅");
        }
    } catch (err) {
        esAvailable = false;
        console.warn("[Elasticsearch] Not available — search disabled. Start ES with Docker to enable it.");
    }
};

export const indexEmail = async (email: {
    id: string;
    to: string;
    subject: string;
    body: string;
    status: string;
    senderEmail?: string;
    scheduledAt: Date;
    sentAt?: Date | null;
    createdAt: Date;
}) => {
    if (!esAvailable) return;
    try {
        await esClient.index({
            index: EMAIL_INDEX,
            id: email.id,
            document: {
                ...email,
                scheduledAt: email.scheduledAt.toISOString(),
                sentAt: email.sentAt?.toISOString() || null,
                createdAt: email.createdAt.toISOString(),
            },
        });
    } catch (err) {
        console.error("[Elasticsearch] Failed to index email:", err);
    }
};

export const searchEmails = async (query: string, from = 0, size = 20) => {
    if (!esAvailable) return null;
    try {
        const result = await esClient.search({
            index: EMAIL_INDEX,
            from,
            size,
            query: {
                multi_match: {
                    query,
                    fields: ["subject^2", "body", "to"],
                },
            },
            sort: [{ createdAt: { order: "desc" } }],
        });
        return result.hits;
    } catch (err) {
        console.error("[Elasticsearch] Search failed:", err);
        return null;
    }
};
