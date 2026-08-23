package api

import infra.web.WebNovel
import infra.web.WebNovelAiGlossary
import infra.web.WebNovelAttention
import infra.web.WebNovelAuthor
import infra.web.WebNovelTaskR18
import infra.web.WebNovelTaskSort
import infra.web.WebNovelType
import infra.web.repository.WebNovelAiGlossaryRepository
import infra.web.repository.WebNovelAiGlossaryStatus
import infra.web.repository.WebNovelChapterRepository
import infra.web.repository.WebNovelMetadataRepository
import infra.web.repository.WebNovelTaskRepository
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.request.header
import io.ktor.server.request.receive
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.put
import io.ktor.server.routing.route
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import org.koin.ktor.ext.inject

@Serializable
enum class ExternalAiGlossaryFilter {
    @SerialName("missing")
    Missing,

    @SerialName("stale")
    Stale,

    @SerialName("current")
    Current,

    @SerialName("missing_or_stale")
    MissingOrStale,

    @SerialName("any")
    Any,
}

@Serializable
enum class ExternalTaskOperation {
    @SerialName("ai_glossary")
    AiGlossary,
}

@Serializable
data class ExternalNovelIdDto(
    val providerId: String,
    val novelId: String,
)

@Serializable
data class ExternalNovelTaskSearchBody(
    val sort: WebNovelTaskSort = WebNovelTaskSort.UpdatedAt,
    val aiGlossaryStatus: ExternalAiGlossaryFilter = ExternalAiGlossaryFilter.MissingOrStale,
    val r18: WebNovelTaskR18 = WebNovelTaskR18.Exclude,
    val excludeNovelIds: List<ExternalNovelIdDto> = emptyList(),
    val limit: Int = 10,
)

@Serializable
data class ExternalAiGlossaryStateDto(
    val status: WebNovelAiGlossaryStatus,
    val generatedAt: Long? = null,
    val sourceRevision: Long? = null,
)

@Serializable
data class ExternalNovelTaskSummaryDto(
    val providerId: String,
    val novelId: String,
    val titleJp: String,
    val authors: List<WebNovelAuthor>,
    val type: WebNovelType,
    val attentions: List<WebNovelAttention>,
    val visited: Long,
    val chapterCount: Int,
    val totalCharacters: Int?,
    val updateAt: Long,
    val aiGlossary: ExternalAiGlossaryStateDto,
)

@Serializable
data class ExternalNovelTaskMetaDto(
    val providerId: String,
    val novelId: String,
    val titleJp: String,
    val authors: List<WebNovelAuthor>,
    val type: WebNovelType,
    val attentions: List<WebNovelAttention>,
    val keywords: List<String>,
    val points: Int?,
    val totalCharacters: Int?,
    val introductionJp: String,
    val visited: Long,
    val syncAt: Long,
    val updateAt: Long,
)

@Serializable
data class ExternalNovelTaskTocItemDto(
    val index: Int,
    val titleJp: String,
    val chapterId: String?,
    val createAt: Long?,
    val characterCount: Int?,
)

@Serializable
data class ExternalNovelTaskDto(
    val meta: ExternalNovelTaskMetaDto,
    val toc: List<ExternalNovelTaskTocItemDto>,
    val contentRevision: Long,
    val taskToken: String,
    val aiGlossary: ExternalAiGlossaryStateDto,
    val availableOperations: List<ExternalTaskOperation>,
)

@Serializable
data class ExternalNovelChapterDto(
    val providerId: String,
    val novelId: String,
    val chapterId: String,
    val index: Int,
    val titleJp: String,
    val paragraphs: List<String>,
)

@Serializable
data class ExternalAiGlossaryUploadResultDto(
    val providerId: String,
    val novelId: String,
    val entryCount: Int,
    val generatedAt: Long,
    val sourceRevision: Long,
)

fun Route.routeExternalTask() {
    val service by inject<ExternalTaskApi>()
    val auth by inject<ExternalTaskAuth>()

    routeExternalTask(service, auth)
}

internal fun Route.routeExternalTask(
    service: ExternalTaskService,
    auth: ExternalTaskAuth,
) {

    route("/external/tasks/novels") {
        post("/search") {
            call.tryRespond {
                auth.authenticate(call.request.header(HttpHeaders.Authorization))
                service.search(call.receive())
            }
        }

        get("/{providerId}/{novelId}") {
            call.tryRespond {
                val credential = auth.authenticate(call.request.header(HttpHeaders.Authorization))
                service.getTask(
                    providerId = call.parameters["providerId"] ?: throwBadRequest("缺少 providerId"),
                    novelId = call.parameters["novelId"] ?: throwBadRequest("缺少 novelId"),
                    credential = credential,
                )
            }
        }

        get("/{providerId}/{novelId}/chapters/{chapterId}") {
            call.tryRespond {
                val credential = auth.authenticate(call.request.header(HttpHeaders.Authorization))
                service.getChapter(
                    providerId = call.parameters["providerId"] ?: throwBadRequest("缺少 providerId"),
                    novelId = call.parameters["novelId"] ?: throwBadRequest("缺少 novelId"),
                    chapterId = call.parameters["chapterId"] ?: throwBadRequest("缺少 chapterId"),
                    taskToken = call.request.header("X-Task-Token"),
                    credential = credential,
                )
            }
        }

        put("/{providerId}/{novelId}/ai-glossary") {
            call.tryRespond {
                val credential = auth.authenticate(call.request.header(HttpHeaders.Authorization))
                service.uploadAiGlossary(
                    providerId = call.parameters["providerId"] ?: throwBadRequest("缺少 providerId"),
                    novelId = call.parameters["novelId"] ?: throwBadRequest("缺少 novelId"),
                    taskToken = call.request.header("X-Task-Token"),
                    credential = credential,
                    glossary = call.receive(),
                )
            }
        }
    }
}

interface ExternalTaskService {
    suspend fun search(body: ExternalNovelTaskSearchBody): List<ExternalNovelTaskSummaryDto>

    suspend fun getTask(
        providerId: String,
        novelId: String,
        credential: ExternalCredential,
    ): ExternalNovelTaskDto

    suspend fun getChapter(
        providerId: String,
        novelId: String,
        chapterId: String,
        taskToken: String?,
        credential: ExternalCredential,
    ): ExternalNovelChapterDto

    suspend fun uploadAiGlossary(
        providerId: String,
        novelId: String,
        taskToken: String?,
        credential: ExternalCredential,
        glossary: Map<String, String>,
    ): ExternalAiGlossaryUploadResultDto
}

class ExternalTaskApi(
    private val metadataRepo: WebNovelMetadataRepository,
    private val taskRepo: WebNovelTaskRepository,
    private val chapterRepo: WebNovelChapterRepository,
    private val aiGlossaryRepo: WebNovelAiGlossaryRepository,
    private val auth: ExternalTaskAuth,
) : ExternalTaskService {
    override suspend fun search(body: ExternalNovelTaskSearchBody): List<ExternalNovelTaskSummaryDto> {
        validateExternalTaskLimit(body.limit)
        val aiGlossaries = aiGlossaryRepo.getAllByNovelId()
        return taskRepo.findCandidates(
            sort = body.sort,
            r18 = body.r18,
            excludedNovelIds = body.excludeNovelIds.map { it.providerId to it.novelId },
        )
            .filter { novel -> isNovelIdAllowed(novel.providerId, novel.novelId) }
            .map { novel -> novel to aiGlossaries[novel.providerId to novel.novelId] }
            .filter { (novel, aiGlossary) ->
                matchesAiGlossaryFilter(
                    filter = body.aiGlossaryStatus,
                    status = aiGlossaryRepo.status(aiGlossary, novel),
                )
            }
            .take(body.limit)
            .map { (novel, aiGlossary) -> novel.asSummary(aiGlossary) }
            .toList()
    }

    override suspend fun getTask(
        providerId: String,
        novelId: String,
        credential: ExternalCredential,
    ): ExternalNovelTaskDto {
        val novel = refreshNovel(providerId, novelId)
        val toc = novel.toc.mapIndexed { index, item ->
            val characterCount = item.chapterId?.let { chapterId ->
                chapterRepo.getOrSyncRemote(providerId, novelId, chapterId)
                    .getOrElse { throwInternalServerError("从源站获取章节失败: ${it.message}") }
                    .paragraphs
                    .let(::originalCharacterCount)
            }
            ExternalNovelTaskTocItemDto(
                index = index,
                titleJp = item.titleJp,
                chapterId = item.chapterId,
                createAt = item.createAt?.epochSeconds,
                characterCount = characterCount,
            )
        }
        val revision = novel.contentRevision()
        val aiGlossary = aiGlossaryRepo.get(providerId, novelId)
        return ExternalNovelTaskDto(
            meta = ExternalNovelTaskMetaDto(
                providerId = novel.providerId,
                novelId = novel.novelId,
                titleJp = novel.titleJp,
                authors = novel.authors,
                type = novel.type,
                attentions = novel.attentions,
                keywords = novel.keywords,
                points = novel.points,
                totalCharacters = novel.totalCharacters,
                introductionJp = novel.introductionJp,
                visited = novel.visited,
                syncAt = novel.syncAt.epochSeconds,
                updateAt = novel.updateAt.epochSeconds,
            ),
            toc = toc,
            contentRevision = revision,
            taskToken = auth.issueTaskToken(providerId, novelId, revision, credential),
            aiGlossary = aiGlossaryState(novel, aiGlossary),
            availableOperations = listOf(ExternalTaskOperation.AiGlossary),
        )
    }

    override suspend fun getChapter(
        providerId: String,
        novelId: String,
        chapterId: String,
        taskToken: String?,
        credential: ExternalCredential,
    ): ExternalNovelChapterDto {
        val novel = refreshNovel(providerId, novelId)
        auth.verifyTaskToken(
            token = taskToken,
            providerId = providerId,
            novelId = novelId,
            contentRevision = novel.contentRevision(),
            credential = credential,
        )
        val index = novel.toc.indexOfFirst { it.chapterId == chapterId }
        if (index == -1) throwNotFound("章节不在目录中")
        val chapter = chapterRepo.getOrSyncRemote(providerId, novelId, chapterId)
            .getOrElse { throwInternalServerError("从源站获取章节失败: ${it.message}") }
        return ExternalNovelChapterDto(
            providerId = providerId,
            novelId = novelId,
            chapterId = chapterId,
            index = index,
            titleJp = novel.toc[index].titleJp,
            paragraphs = chapter.paragraphs,
        )
    }

    override suspend fun uploadAiGlossary(
        providerId: String,
        novelId: String,
        taskToken: String?,
        credential: ExternalCredential,
        glossary: Map<String, String>,
    ): ExternalAiGlossaryUploadResultDto {
        val normalizedGlossary = normalizeAiGlossary(glossary)
        val novel = refreshNovel(providerId, novelId)
        val verifiedToken = auth.verifyTaskToken(
            token = taskToken,
            providerId = providerId,
            novelId = novelId,
            contentRevision = novel.contentRevision(),
            credential = credential,
        )
        val saved = aiGlossaryRepo.replace(
            novel = novel,
            glossary = normalizedGlossary,
            uploaderCredential = verifiedToken.credentialFingerprint,
            taskTokenId = verifiedToken.id,
        )
        return ExternalAiGlossaryUploadResultDto(
            providerId = providerId,
            novelId = novelId,
            entryCount = saved.glossary.size,
            generatedAt = saved.createdAt.epochSeconds,
            sourceRevision = saved.sourceUpdateAt.toEpochMilliseconds(),
        )
    }

    private suspend fun refreshNovel(providerId: String, novelId: String): WebNovel {
        validateId(providerId, novelId)
        return metadataRepo.getNovelAndSave(providerId, novelId, expiredMinutes = 0)
            .getOrElse { throwInternalServerError("从源站获取小说失败: ${it.message}") }
    }

    private fun WebNovel.asSummary(
        aiGlossary: WebNovelAiGlossary?,
    ) = ExternalNovelTaskSummaryDto(
        providerId = providerId,
        novelId = novelId,
        titleJp = titleJp,
        authors = authors,
        type = type,
        attentions = attentions,
        visited = visited,
        chapterCount = toc.count { it.chapterId != null },
        totalCharacters = totalCharacters,
        updateAt = updateAt.epochSeconds,
        aiGlossary = aiGlossaryState(this, aiGlossary),
    )

    private fun aiGlossaryState(
        novel: WebNovel,
        aiGlossary: WebNovelAiGlossary?,
    ) = ExternalAiGlossaryStateDto(
        status = aiGlossaryRepo.status(aiGlossary, novel),
        generatedAt = aiGlossary?.createdAt?.epochSeconds,
        sourceRevision = aiGlossary?.sourceUpdateAt?.toEpochMilliseconds(),
    )

    private fun WebNovel.contentRevision(): Long = updateAt.toEpochMilliseconds()
}

internal fun matchesAiGlossaryFilter(
    filter: ExternalAiGlossaryFilter,
    status: WebNovelAiGlossaryStatus,
): Boolean = when (filter) {
    ExternalAiGlossaryFilter.Missing -> status == WebNovelAiGlossaryStatus.Missing
    ExternalAiGlossaryFilter.Stale -> status == WebNovelAiGlossaryStatus.Stale
    ExternalAiGlossaryFilter.Current -> status == WebNovelAiGlossaryStatus.Current
    ExternalAiGlossaryFilter.MissingOrStale -> status != WebNovelAiGlossaryStatus.Current
    ExternalAiGlossaryFilter.Any -> true
}

internal fun validateExternalTaskLimit(limit: Int) {
    if (limit !in 1..10) {
        throwBadRequest("limit 必须在 1 到 10 之间")
    }
}

internal fun originalCharacterCount(paragraphs: List<String>): Int =
    paragraphs.sumOf { paragraph -> paragraph.codePointCount(0, paragraph.length) }

internal fun normalizeAiGlossary(glossary: Map<String, String>): Map<String, String> {
    if (glossary.isEmpty()) {
        throw HttpException(HttpStatusCode.UnprocessableEntity, "AI 术语表至少需要一个条目")
    }
    val normalized = linkedMapOf<String, String>()
    glossary.forEach { (rawSource, rawTarget) ->
        val source = rawSource.trim()
        val target = rawTarget.trim()
        if (source.isEmpty() || target.isEmpty()) {
            throw HttpException(HttpStatusCode.UnprocessableEntity, "术语和译文不能为空")
        }
        if (normalized.put(source, target) != null) {
            throw HttpException(HttpStatusCode.UnprocessableEntity, "术语表包含重复术语: $source")
        }
    }
    return normalized
}
