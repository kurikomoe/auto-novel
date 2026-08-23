package infra.web.repository

import com.mongodb.client.model.IndexOptions
import com.mongodb.client.model.Indexes
import com.mongodb.client.model.UpdateOptions
import com.mongodb.client.model.Updates.combine
import com.mongodb.client.model.Updates.set
import infra.MongoClient
import infra.MongoCollectionNames
import infra.common.Glossary
import infra.field
import infra.web.WebNovel
import infra.web.WebNovelAiGlossary
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Clock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.nio.charset.StandardCharsets
import java.util.UUID

@Serializable
enum class WebNovelAiGlossaryStatus {
    @SerialName("missing")
    Missing,

    @SerialName("stale")
    Stale,

    @SerialName("current")
    Current,
}

class WebNovelAiGlossaryRepository(
    mongo: MongoClient,
) {
    private val collection = mongo.database.getCollection<WebNovelAiGlossary>(
        MongoCollectionNames.WEB_AI_GLOSSARY,
    )
    private val indexMutex = Mutex()

    @Volatile
    private var indexesReady = false

    private suspend fun ensureIndexes() {
        if (indexesReady) return
        indexMutex.withLock {
            if (indexesReady) return
            collection.createIndex(
                Indexes.compoundIndex(
                    Indexes.ascending("providerId"),
                    Indexes.ascending("bookId"),
                ),
                IndexOptions().unique(true),
            )
            collection.createIndex(
                Indexes.compoundIndex(
                    Indexes.ascending("sourceUpdateAt"),
                    Indexes.ascending("createdAt"),
                )
            )
            indexesReady = true
        }
    }

    suspend fun get(providerId: String, novelId: String): WebNovelAiGlossary? =
        collection.find(WebNovelAiGlossary.byNovelId(providerId, novelId)).firstOrNull()

    suspend fun getAllByNovelId(): Map<Pair<String, String>, WebNovelAiGlossary> =
        collection.find().toList().associateBy { it.providerId to it.novelId }

    fun status(
        aiGlossary: WebNovelAiGlossary?,
        novel: WebNovel,
    ): WebNovelAiGlossaryStatus = aiGlossaryStatus(aiGlossary, novel)

    suspend fun status(novel: WebNovel): WebNovelAiGlossaryStatus =
        status(get(novel.providerId, novel.novelId), novel)

    suspend fun replace(
        novel: WebNovel,
        glossary: Map<String, String>,
        uploaderCredential: String,
        taskTokenId: String,
    ): WebNovelAiGlossary {
        ensureIndexes()
        val glossaryUuid = UUID.randomUUID().toString()
        val createdAt = Clock.System.now()
        collection.updateOne(
            WebNovelAiGlossary.byNovelId(novel.providerId, novel.novelId),
            combine(
                set(WebNovelAiGlossary::providerId.field(), novel.providerId),
                set(WebNovelAiGlossary::novelId.field(), novel.novelId),
                set(WebNovelAiGlossary::glossaryUuid.field(), glossaryUuid),
                set(WebNovelAiGlossary::glossary.field(), glossary),
                set(WebNovelAiGlossary::sourceUpdateAt.field(), novel.updateAt),
                set(WebNovelAiGlossary::createdAt.field(), createdAt),
                set(WebNovelAiGlossary::uploaderCredential.field(), uploaderCredential),
                set(WebNovelAiGlossary::taskTokenId.field(), taskTokenId),
            ),
            UpdateOptions().upsert(true),
        )
        return checkNotNull(get(novel.providerId, novel.novelId)) {
            "AI glossary upsert completed without a readable document"
        }
    }

    suspend fun effectiveGlossary(novel: WebNovel): Glossary =
        mergeGlossaries(novel, get(novel.providerId, novel.novelId))
}

fun aiGlossaryStatus(
    aiGlossary: WebNovelAiGlossary?,
    novel: WebNovel,
): WebNovelAiGlossaryStatus = when {
    aiGlossary == null -> WebNovelAiGlossaryStatus.Missing
    aiGlossary.sourceUpdateAt != novel.updateAt -> WebNovelAiGlossaryStatus.Stale
    else -> WebNovelAiGlossaryStatus.Current
}

fun mergeGlossaries(
    novel: WebNovel,
    aiGlossary: WebNovelAiGlossary?,
): Glossary {
    val ai = aiGlossary?.glossary.orEmpty()
        .filter { (source, target) -> source.isNotBlank() && target.isNotBlank() }
    val human = novel.glossary
        .filter { (source, target) -> source.isNotBlank() && target.isNotBlank() }

    val merged = LinkedHashMap<String, String>(ai.size + human.size)
    merged.putAll(ai)
    merged.putAll(human)

    if (merged.isEmpty()) return Glossary("no glossary", emptyMap())

    val sourceIdsAndContent = buildString {
        appendGlossaryFingerprint(novel.glossaryUuid ?: "no glossary", human)
        appendGlossaryFingerprint(aiGlossary?.glossaryUuid ?: "no ai glossary", ai)
    }
    val uuid = UUID.nameUUIDFromBytes(sourceIdsAndContent.toByteArray(StandardCharsets.UTF_8))
    return Glossary("merged-$uuid", merged)
}

private fun StringBuilder.appendGlossaryFingerprint(
    id: String,
    glossary: Map<String, String>,
) {
    append(id.length).append(':').append(id).append(';')
    glossary.toSortedMap().forEach { (source, target) ->
        append(source.length).append(':').append(source)
        append(target.length).append(':').append(target).append(';')
    }
}
