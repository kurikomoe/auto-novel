package api

import api.plugins.contentNegotiation
import infra.web.WebNovelAuthor
import infra.web.WebNovelType
import infra.web.repository.WebNovelAiGlossaryStatus
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import io.ktor.client.request.header
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.routing.routing
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json

class RouteExternalTaskTest : DescribeSpec({
    val json = Json { explicitNulls = false }
    val auth = ExternalTaskAuth(
        apiKey = "external-key",
        taskTokenSecret = "external-task-token-secret",
    )

    describe("external task routes") {
        it("requires the independent API key") {
            val service = FakeExternalTaskService(auth)
            testApplication {
                application {
                    contentNegotiation()
                    routing { routeExternalTask(service, auth) }
                }

                val response = client.post("/external/tasks/novels/search") {
                    contentType(ContentType.Application.Json)
                    setBody("{}")
                }
                response.status shouldBe HttpStatusCode.Unauthorized
                service.searchCalls shouldBe 0
            }
        }

        it("supports search, detail, original chapter and AI upload as one flow") {
            val service = FakeExternalTaskService(auth)
            testApplication {
                application {
                    contentNegotiation()
                    routing { routeExternalTask(service, auth) }
                }

                val search = client.post("/external/tasks/novels/search") {
                    externalAuth()
                    contentType(ContentType.Application.Json)
                    setBody("{}")
                }
                search.status shouldBe HttpStatusCode.OK
                service.searchCalls shouldBe 1

                val detailResponse = client.get("/external/tasks/novels/syosetu/n1") {
                    externalAuth()
                }
                detailResponse.status shouldBe HttpStatusCode.OK
                val detail = json.decodeFromString<ExternalNovelTaskDto>(detailResponse.bodyAsText())
                detail.contentRevision shouldBe 100
                detail.availableOperations shouldBe listOf(ExternalTaskOperation.AiGlossary)

                val chapter = client.get("/external/tasks/novels/syosetu/n1/chapters/c1") {
                    externalAuth()
                    header("X-Task-Token", detail.taskToken)
                }
                chapter.status shouldBe HttpStatusCode.OK
                chapter.bodyAsText() shouldNotContain "paragraphsZh"
                json.decodeFromString<ExternalNovelChapterDto>(chapter.bodyAsText()).paragraphs shouldBe
                    listOf("原文")

                val upload = client.put("/external/tasks/novels/syosetu/n1/ai-glossary") {
                    externalAuth()
                    header("X-Task-Token", detail.taskToken)
                    contentType(ContentType.Application.Json)
                    setBody("{\"用語\":\"术语\"}")
                }
                upload.status shouldBe HttpStatusCode.OK
                service.lastUpload shouldBe mapOf("用語" to "术语")

                service.revision = 101
                val staleChapter = client.get(
                    "/external/tasks/novels/syosetu/n1/chapters/c1"
                ) {
                    externalAuth()
                    header("X-Task-Token", detail.taskToken)
                }
                staleChapter.status shouldBe HttpStatusCode.Conflict

                val staleUpload = client.put("/external/tasks/novels/syosetu/n1/ai-glossary") {
                    externalAuth()
                    header("X-Task-Token", detail.taskToken)
                    contentType(ContentType.Application.Json)
                    setBody("{\"用語\":\"新术语\"}")
                }
                staleUpload.status shouldBe HttpStatusCode.Conflict
            }
        }
    }
})

private fun io.ktor.client.request.HttpRequestBuilder.externalAuth() {
    header(HttpHeaders.Authorization, "Bearer external-key")
}

private class FakeExternalTaskService(
    private val auth: ExternalTaskAuth,
) : ExternalTaskService {
    var revision = 100L
    var searchCalls = 0
    var lastUpload: Map<String, String>? = null

    override suspend fun search(
        body: ExternalNovelTaskSearchBody,
    ): List<ExternalNovelTaskSummaryDto> {
        searchCalls += 1
        return emptyList()
    }

    override suspend fun getTask(
        providerId: String,
        novelId: String,
        credential: ExternalCredential,
    ): ExternalNovelTaskDto = ExternalNovelTaskDto(
        meta = ExternalNovelTaskMetaDto(
            providerId = providerId,
            novelId = novelId,
            titleJp = "作品",
            authors = listOf(WebNovelAuthor("作者", null)),
            type = WebNovelType.连载中,
            attentions = emptyList(),
            keywords = emptyList(),
            points = 1,
            totalCharacters = 2,
            introductionJp = "简介",
            visited = 1,
            syncAt = 1,
            updateAt = 1,
        ),
        toc = listOf(ExternalNovelTaskTocItemDto(0, "第一章", "c1", null, 2)),
        contentRevision = revision,
        taskToken = auth.issueTaskToken(providerId, novelId, revision, credential),
        aiGlossary = ExternalAiGlossaryStateDto(WebNovelAiGlossaryStatus.Missing),
        availableOperations = listOf(ExternalTaskOperation.AiGlossary),
    )

    override suspend fun getChapter(
        providerId: String,
        novelId: String,
        chapterId: String,
        taskToken: String?,
        credential: ExternalCredential,
    ): ExternalNovelChapterDto {
        auth.verifyTaskToken(taskToken, providerId, novelId, revision, credential)
        return ExternalNovelChapterDto(providerId, novelId, chapterId, 0, "第一章", listOf("原文"))
    }

    override suspend fun uploadAiGlossary(
        providerId: String,
        novelId: String,
        taskToken: String?,
        credential: ExternalCredential,
        glossary: Map<String, String>,
    ): ExternalAiGlossaryUploadResultDto {
        auth.verifyTaskToken(taskToken, providerId, novelId, revision, credential)
        lastUpload = normalizeAiGlossary(glossary)
        return ExternalAiGlossaryUploadResultDto(providerId, novelId, glossary.size, 1, revision)
    }
}
