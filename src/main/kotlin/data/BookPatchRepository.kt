package data

import com.mongodb.client.model.UpdateOptions
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Contextual
import kotlinx.serialization.Serializable
import org.bson.conversions.Bson
import org.litote.kmongo.*
import org.litote.kmongo.util.KMongoUtil.toBson
import java.time.LocalDateTime
import java.util.UUID

@Serializable
data class BookPatch(
    val providerId: String,
    val bookId: String,
    val titleJp: String,
    val titleZh: String?,
    val patches: List<BookMetadataPatch>,
    val toc: Map<String, BookEpisodePatches>,
)

@Serializable
data class BookPatchOutline(
    val providerId: String,
    val bookId: String,
    val titleJp: String,
    val titleZh: String?,
)

@Serializable
data class BookMetadataPatch(
    val uuid: String,
    val titleChange: TextChange?,
    val introductionChange: TextChange?,
    val glossary: Map<String, String>?,
    val tocChange: List<TextChange>,
    @Contextual val createAt: LocalDateTime,
) {
    @Serializable
    data class TextChange(
        val jp: String,
        val zhOld: String?,
        val zhNew: String,
    )
}

@Serializable
data class BookEpisodePatches(
    val titleJp: String,
    val titleZh: String?,
    val patches: List<BookEpisodePatch>,
)

@Serializable
data class BookEpisodePatch(
    val uuid: String,
    val paragraphsChange: List<TextChange>,
    @Contextual val createAt: LocalDateTime,
) {
    @Serializable
    data class TextChange(
        val index: Int,
        val jp: String,
        val zhOld: String,
        val zhNew: String,
    )
}

class BookPatchRepository(
    private val mongoDataSource: MongoDataSource,
    private val bookMetadataRepository: BookMetadataRepository,
    private val bookEpisodeRepository: BookEpisodeRepository,
) {
    private val col
        get() = mongoDataSource.database.getCollection<BookPatch>("patch")

    init {
        runBlocking {
            col.ensureUniqueIndex(
                BookPatch::providerId,
                BookPatch::bookId,
            )
        }
    }

    // List operations
    suspend fun list(
        page: Int,
        pageSize: Int,
    ): List<BookPatchOutline> {
        return col
            .withDocumentClass<BookPatchOutline>()
            .find()
            .sort(toBson("{ _id: -1 }"))
            .skip(page * pageSize)
            .limit(pageSize)
            .projection(
                BookPatchOutline::providerId,
                BookPatchOutline::bookId,
                BookPatchOutline::titleJp,
                BookPatchOutline::titleZh,
            )
            .toList()
    }

    suspend fun count(): Long {
        return col.countDocuments()
    }

    // Element operations
    private fun bsonSpecifyPatch(providerId: String, bookId: String): Bson {
        return and(
            BookPatch::providerId eq providerId,
            BookPatch::bookId eq bookId,
        )
    }

    suspend fun get(
        providerId: String,
        bookId: String,
    ): BookPatch? {
        return col.findOne(
            bsonSpecifyPatch(providerId, bookId),
        )
    }

    private suspend fun createIfNotExist(
        providerId: String,
        bookId: String,
        titleJp: String,
        titleZh: String?,
    ) {
        col.updateOne(
            bsonSpecifyPatch(providerId, bookId),
            setValueOnInsert(
                BookPatch(
                    providerId = providerId,
                    bookId = bookId,
                    titleJp = titleJp,
                    titleZh = titleZh,
                    patches = emptyList(),
                    toc = emptyMap(),
                )
            ),
            UpdateOptions().upsert(true),
        )
    }

    suspend fun addMetadataPatch(
        providerId: String,
        bookId: String,
        title: String?,
        introduction: String?,
        glossary: Map<String, String>?,
        toc: Map<String, String>,
    ) {
        val metadata = bookMetadataRepository.getLocal(providerId, bookId)
            ?: return

        fun createTextChangeOrNull(jp: String, zhOld: String?, zhNew: String?): BookMetadataPatch.TextChange? {
            return if (zhNew != null && zhNew != zhOld) {
                BookMetadataPatch.TextChange(jp, zhOld, zhNew)
            } else null
        }

        val titleChange = createTextChangeOrNull(
            metadata.titleJp,
            metadata.titleZh,
            title,
        )
        val introductionChange = createTextChangeOrNull(
            metadata.introductionJp,
            metadata.introductionZh,
            introduction,
        )
        val glossaryChange = glossary?.takeIf {
            glossary != metadata.glossary
        }
        val tocChange = toc.mapNotNull { (jp, zhNew) ->
            metadata.toc.find { it.titleJp == jp }?.let { item ->
                BookMetadataPatch.TextChange(jp = item.titleJp, zhOld = item.titleZh, zhNew = zhNew)
            }
        }

        if (
            titleChange == null &&
            introductionChange == null &&
            glossaryChange == null &&
            tocChange.isEmpty()
        ) {
            return
        }

        // Add patch
        createIfNotExist(
            providerId = providerId,
            bookId = bookId,
            titleJp = metadata.titleJp,
            titleZh = metadata.titleZh,
        )
        val patch = BookMetadataPatch(
            uuid = UUID.randomUUID().toString(),
            titleChange = titleChange,
            introductionChange = introductionChange,
            tocChange = tocChange,
            glossary = glossaryChange,
            createAt = LocalDateTime.now(),
        )
        col.updateOne(
            bsonSpecifyPatch(providerId, bookId),
            push(BookPatch::patches, patch),
        )

        // Apply patch
        val tocZh = metadata.toc.mapIndexedNotNull { index, item ->
            toc[item.titleJp]?.let { index to it }
        }.toMap()
        bookMetadataRepository.updateZh(
            providerId = providerId,
            bookId = bookId,
            titleZh = title,
            introductionZh = introduction,
            glossary = glossaryChange,
            tocZh = tocZh,
        )
    }

    suspend fun addEpisodePatch(
        providerId: String,
        bookId: String,
        episodeId: String,
        paragraphs: Map<Int, String>,
    ) {
        val metadata = bookMetadataRepository.getLocal(providerId, bookId)
            ?: return
        val episode = bookEpisodeRepository.getLocal(providerId, bookId, episodeId)
            ?: return
        val tocItem = metadata.toc.find { it.episodeId == episodeId }
            ?: return

        if (episode.paragraphsZh == null) return

        val paragraphsChange = paragraphs.mapNotNull { (index, zhNew) ->
            val zhOld = episode.paragraphsZh.getOrNull(index) ?: return@mapNotNull null
            if (zhOld == zhNew) return@mapNotNull null
            val jp = episode.paragraphsJp[index]
            BookEpisodePatch.TextChange(index = index, jp = jp, zhOld = zhOld, zhNew = zhNew)
        }

        if (paragraphsChange.isEmpty()) {
            return
        }

        // Add patch
        createIfNotExist(
            providerId = providerId,
            bookId = bookId,
            titleJp = metadata.titleJp,
            titleZh = metadata.titleZh,
        )

        val patches = BookEpisodePatches(
            titleJp = tocItem.titleJp,
            titleZh = tocItem.titleZh,
            patches = emptyList(),
        )
        col.updateOne(
            and(
                bsonSpecifyPatch(providerId, bookId),
                BookPatch::toc.keyProjection(episodeId) exists false,
            ),
            setValue(BookPatch::toc.keyProjection(episodeId), patches),
        )

        val patch = BookEpisodePatch(
            uuid = UUID.randomUUID().toString(),
            paragraphsChange = paragraphsChange,
            createAt = LocalDateTime.now(),
        )
        col.updateOne(
            bsonSpecifyPatch(providerId, bookId),
            push(BookPatch::toc.keyProjection(episodeId) / BookEpisodePatches::patches, patch),
        )

        // Apply patch
        bookEpisodeRepository.updateZh(
            providerId = providerId,
            bookId = bookId,
            episodeId = episodeId,
            paragraphsZh = paragraphsChange.associate { it.index to it.zhNew },
        )
    }

    suspend fun deletePatch(
        providerId: String,
        bookId: String,
    ) {
        col.deleteOne(
            bsonSpecifyPatch(providerId, bookId),
        )
    }
}