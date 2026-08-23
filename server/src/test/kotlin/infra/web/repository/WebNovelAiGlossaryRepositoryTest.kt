package infra.web.repository

import infra.web.WebNovel
import infra.web.WebNovelAiGlossary
import infra.web.WebNovelAuthor
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.maps.shouldContainExactly
import io.kotest.matchers.shouldBe
import kotlinx.datetime.Instant
import org.bson.types.ObjectId

class WebNovelAiGlossaryRepositoryTest : DescribeSpec({
    val updatedAt = Instant.parse("2026-08-23T00:00:00Z")
    fun novel(glossary: Map<String, String>) = WebNovel(
        id = ObjectId(),
        providerId = "syosetu",
        novelId = "n1",
        titleJp = "title",
        authors = listOf(WebNovelAuthor("author", null)),
        points = 1,
        introductionJp = "intro",
        glossaryUuid = "human-v1",
        glossary = glossary,
        toc = emptyList(),
        updateAt = updatedAt,
    )

    fun ai(
        glossary: Map<String, String>,
        sourceUpdateAt: Instant = updatedAt,
    ) = WebNovelAiGlossary(
        id = ObjectId(),
        providerId = "syosetu",
        novelId = "n1",
        glossaryUuid = "ai-v1",
        glossary = glossary,
        sourceUpdateAt = sourceUpdateAt,
        createdAt = updatedAt,
        uploaderCredential = "fingerprint",
        taskTokenId = "token-id",
    )

    describe("mergeGlossaries") {
        it("returns the no-glossary identity when both sources are empty") {
            mergeGlossaries(novel(emptyMap()), null) shouldBe
                infra.common.Glossary("no glossary", emptyMap())
        }

        it("uses AI entries when no human glossary exists") {
            mergeGlossaries(novel(emptyMap()), ai(mapOf("AI" to "人工智能"))).map
                .shouldContainExactly(mapOf("AI" to "人工智能"))
        }

        it("uses a human glossary without AI") {
            mergeGlossaries(novel(mapOf("人工" to "人工译名")), null).map
                .shouldContainExactly(mapOf("人工" to "人工译名"))
        }

        it("uses human values on conflicts and keeps both unique sources") {
            val merged = mergeGlossaries(
                novel(mapOf("勇者" to "勇者", "王" to "国王")),
                ai(mapOf("勇者" to "英雄", "魔王" to "魔王")),
            )
            merged.map.shouldContainExactly(
                mapOf("勇者" to "勇者", "王" to "国王", "魔王" to "魔王")
            )
            merged.id.startsWith("merged-") shouldBe true
        }

        it("falls back to AI when an abnormal human value is blank") {
            mergeGlossaries(
                novel(mapOf("勇者" to "")),
                ai(mapOf("勇者" to "英雄")),
            ).map["勇者"] shouldBe "英雄"
        }

        it("continues to merge stale AI and fingerprints source content") {
            val staleAi = ai(
                mapOf("AI" to "旧译名"),
                Instant.parse("2026-08-22T00:00:00Z"),
            )
            val first = mergeGlossaries(novel(emptyMap()), staleAi)
            val same = mergeGlossaries(novel(emptyMap()), staleAi)
            val changed = mergeGlossaries(
                novel(emptyMap()),
                staleAi.copy(glossary = mapOf("AI" to "新译名")),
            )

            first.map["AI"] shouldBe "旧译名"
            first.id shouldBe same.id
            (first.id == changed.id) shouldBe false
        }
    }

    describe("aiGlossaryStatus") {
        it("distinguishes missing, current and stale snapshots") {
            val novel = novel(emptyMap())
            aiGlossaryStatus(null, novel) shouldBe WebNovelAiGlossaryStatus.Missing
            aiGlossaryStatus(ai(emptyMap()), novel) shouldBe WebNovelAiGlossaryStatus.Current
            aiGlossaryStatus(
                ai(emptyMap(), Instant.parse("2026-08-22T00:00:00Z")),
                novel,
            ) shouldBe WebNovelAiGlossaryStatus.Stale
        }
    }
})
