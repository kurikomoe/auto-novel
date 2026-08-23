package api

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import infra.web.repository.WebNovelAiGlossaryStatus

class ExternalTaskAuthTest : DescribeSpec({
    val auth = ExternalTaskAuth(
        apiKey = "client-secret",
        taskTokenSecret = "task-token-secret-that-is-long-enough",
    )

    describe("external API authentication") {
        it("accepts the configured bearer key and rejects a different key") {
            val credential = auth.authenticate("Bearer client-secret")
            credential.fingerprint shouldBe ExternalTaskAuth.fingerprint("client-secret")

            shouldThrow<HttpException> {
                auth.authenticate("Bearer wrong")
            }.status shouldBe HttpStatusCode.Unauthorized
        }

        it("does not accept requests when external credentials are unconfigured") {
            shouldThrow<HttpException> {
                ExternalTaskAuth("", "").authenticate("Bearer anything")
            }.status shouldBe HttpStatusCode.ServiceUnavailable
        }

        it("binds task tokens to credential, novel and content revision") {
            val credential = auth.authenticate("Bearer client-secret")
            val token = auth.issueTaskToken("syosetu", "n1", 100, credential)

            auth.verifyTaskToken(token, "syosetu", "n1", 100, credential).id.isNotBlank() shouldBe true

            shouldThrow<HttpException> {
                auth.verifyTaskToken(token, "syosetu", "n2", 100, credential)
            }.status shouldBe HttpStatusCode.Unauthorized

            shouldThrow<HttpException> {
                auth.verifyTaskToken(
                    token,
                    "syosetu",
                    "n1",
                    100,
                    ExternalCredential("another-credential"),
                )
            }.status shouldBe HttpStatusCode.Unauthorized

            val tampered = token.replaceRange(5, 6, if (token[5] == 'a') "b" else "a")
            shouldThrow<HttpException> {
                auth.verifyTaskToken(tampered, "syosetu", "n1", 100, credential)
            }.status shouldBe HttpStatusCode.Unauthorized

            shouldThrow<HttpException> {
                auth.verifyTaskToken(token, "syosetu", "n1", 101, credential)
            }.status shouldBe HttpStatusCode.Conflict
        }
    }

    describe("AI glossary validation") {
        it("normalizes whitespace") {
            normalizeAiGlossary(mapOf("  用語 " to " 术语 ")) shouldBe mapOf("用語" to "术语")
        }

        it("rejects empty snapshots and duplicate normalized terms") {
            shouldThrow<HttpException> {
                normalizeAiGlossary(emptyMap())
            }.status shouldBe HttpStatusCode.UnprocessableEntity

            shouldThrow<HttpException> {
                normalizeAiGlossary(linkedMapOf("用語" to "术语", " 用語 " to "词语"))
            }.status shouldBe HttpStatusCode.UnprocessableEntity

            shouldThrow<HttpException> {
                normalizeAiGlossary(mapOf("用語" to "   "))
            }.status shouldBe HttpStatusCode.UnprocessableEntity
        }
    }

    describe("external task contract") {
        it("uses safe search defaults") {
            val body = Json.decodeFromString<ExternalNovelTaskSearchBody>("{}")
            body.limit shouldBe 10
            body.aiGlossaryStatus shouldBe ExternalAiGlossaryFilter.MissingOrStale
        }

        it("rejects search limits outside 1 through 10") {
            validateExternalTaskLimit(1)
            validateExternalTaskLimit(10)
            shouldThrow<HttpException> { validateExternalTaskLimit(0) }
            shouldThrow<HttpException> { validateExternalTaskLimit(11) }
        }

        it("counts Unicode code points in original paragraphs") {
            originalCharacterCount(listOf("ab", "𠮷野家")) shouldBe 5
        }

        it("matches every AI glossary status filter") {
            matchesAiGlossaryFilter(
                ExternalAiGlossaryFilter.MissingOrStale,
                WebNovelAiGlossaryStatus.Missing,
            ) shouldBe true
            matchesAiGlossaryFilter(
                ExternalAiGlossaryFilter.MissingOrStale,
                WebNovelAiGlossaryStatus.Stale,
            ) shouldBe true
            matchesAiGlossaryFilter(
                ExternalAiGlossaryFilter.MissingOrStale,
                WebNovelAiGlossaryStatus.Current,
            ) shouldBe false
            WebNovelAiGlossaryStatus.entries.forEach { status ->
                matchesAiGlossaryFilter(ExternalAiGlossaryFilter.Any, status) shouldBe true
            }
        }

        it("chapter DTO serializes original content only") {
            val json = Json.encodeToString(
                ExternalNovelChapterDto(
                    providerId = "syosetu",
                    novelId = "n1",
                    chapterId = "c1",
                    index = 0,
                    titleJp = "第一章",
                    paragraphs = listOf("原文"),
                )
            )
            json shouldNotContain "paragraphsZh"
            json shouldNotContain "titleZh"
            json shouldNotContain "glossary"
        }
    }
})
