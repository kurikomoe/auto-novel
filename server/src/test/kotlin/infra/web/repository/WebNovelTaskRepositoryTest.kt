package infra.web.repository

import com.mongodb.client.model.Filters.eq
import infra.MongoClient
import infra.MongoCollectionNames
import infra.field
import infra.web.WebNovel
import infra.web.WebNovelAiGlossary
import infra.web.WebNovelAttention
import infra.web.WebNovelAuthor
import infra.web.WebNovelTaskR18
import infra.web.WebNovelTaskSort
import infra.web.WebNovelTocItem
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.shouldBe
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.datetime.Instant
import org.bson.types.ObjectId
import java.util.UUID

class WebNovelTaskRepositoryTest : DescribeSpec({
    val mongo = MongoClient(
        host = System.getenv("DB_HOST_TEST") ?: "localhost",
        port = System.getenv("DB_PORT_MONGO_TEST")?.toIntOrNull(),
    )
    val taskRepo = WebNovelTaskRepository(mongo)
    val aiGlossaryRepo = WebNovelAiGlossaryRepository(mongo)
    val metadataCollection = mongo.database.getCollection<WebNovel>(
        MongoCollectionNames.WEB_NOVEL,
    )
    val aiGlossaryCollection = mongo.database.getCollection<WebNovelAiGlossary>(
        MongoCollectionNames.WEB_AI_GLOSSARY,
    )
    val providerId = "task-test-${UUID.randomUUID()}"

    fun novel(index: Int): WebNovel = WebNovel(
        id = ObjectId(index.toString(16).padStart(24, '0')),
        providerId = providerId,
        novelId = "n$index",
        titleJp = "novel-$index",
        authors = listOf(WebNovelAuthor("author", null)),
        attentions = when (index) {
            10 -> listOf(WebNovelAttention.R18)
            11 -> listOf(WebNovelAttention.性描写)
            else -> emptyList()
        },
        points = index,
        totalCharacters = index * 100,
        introductionJp = "intro",
        toc = listOf(WebNovelTocItem("chapter", null, "c$index")),
        visited = index.toLong(),
        updateAt = Instant.fromEpochSeconds(if (index <= 1) 10_000L else 10_000L - index),
    )

    beforeSpec {
        metadataCollection.insertMany((0..11).map(::novel))
    }

    afterSpec {
        metadataCollection.deleteMany(eq(WebNovel::providerId.field(), providerId))
        aiGlossaryCollection.deleteMany(eq(WebNovelAiGlossary::providerId.field(), providerId))
    }

    describe("task candidate query") {
        it("sorts descending and uses ascending id as a stable tie breaker") {
            taskRepo.findCandidates(
                WebNovelTaskSort.UpdatedAt,
                WebNovelTaskR18.Include,
                emptyList(),
            ).take(2).map { it.novelId }.toList() shouldContainExactly listOf("n0", "n1")

            taskRepo.findCandidates(
                WebNovelTaskSort.Views,
                WebNovelTaskR18.Include,
                emptyList(),
            ).take(2).map { it.novelId }.toList() shouldContainExactly listOf("n11", "n10")
        }

        it("supports R18 exclusion, inclusion and only modes") {
            taskRepo.findCandidates(
                WebNovelTaskSort.Views,
                WebNovelTaskR18.Exclude,
                emptyList(),
            ).map { it.novelId }.toList().toSet() shouldBe (0..9).map { "n$it" }.toSet()

            taskRepo.findCandidates(
                WebNovelTaskSort.Views,
                WebNovelTaskR18.Only,
                emptyList(),
            ).map { it.novelId }.toList() shouldContainExactly listOf("n11", "n10")

            taskRepo.findCandidates(
                WebNovelTaskSort.Views,
                WebNovelTaskR18.Include,
                emptyList(),
            ).take(12).toList().size shouldBe 12
        }

        it("excludes requested novel identities and can be capped at ten") {
            val result = taskRepo.findCandidates(
                WebNovelTaskSort.Views,
                WebNovelTaskR18.Include,
                listOf(providerId to "n11"),
            ).take(10).map { it.novelId }.toList()

            result.size shouldBe 10
            result.first() shouldBe "n10"
            ("n11" in result) shouldBe false
        }
    }

    describe("AI glossary snapshot storage") {
        it("atomically replaces the previous snapshot and keeps one document") {
            val novel = novel(0)
            aiGlossaryRepo.replace(novel, mapOf("first" to "第一"), "credential-1", "token-1")
            val latest = aiGlossaryRepo.replace(
                novel,
                mapOf("second" to "第二"),
                "credential-2",
                "token-2",
            )

            latest.glossary shouldBe mapOf("second" to "第二")
            latest.uploaderCredential shouldBe "credential-2"
            latest.taskTokenId shouldBe "token-2"
            aiGlossaryCollection.countDocuments(
                WebNovelAiGlossary.byNovelId(providerId, novel.novelId)
            ) shouldBe 1
        }
    }
})
