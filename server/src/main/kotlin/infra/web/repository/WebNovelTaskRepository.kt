package infra.web.repository

import com.mongodb.client.model.Filters.and
import com.mongodb.client.model.Filters.eq
import com.mongodb.client.model.Filters.exists
import com.mongodb.client.model.Filters.nor
import com.mongodb.client.model.Filters.or
import com.mongodb.client.model.Sorts.ascending
import com.mongodb.client.model.Sorts.descending
import com.mongodb.client.model.Sorts.orderBy
import infra.MongoClient
import infra.MongoCollectionNames
import infra.field
import infra.web.WebNovel
import infra.web.WebNovelAttention
import infra.web.WebNovelTaskR18
import infra.web.WebNovelTaskSort
import kotlinx.coroutines.flow.Flow
import org.bson.conversions.Bson

class WebNovelTaskRepository(
    mongo: MongoClient,
) {
    private val collection = mongo.database.getCollection<WebNovel>(
        MongoCollectionNames.WEB_NOVEL,
    )

    fun findCandidates(
        sort: WebNovelTaskSort,
        r18: WebNovelTaskR18,
        excludedNovelIds: List<Pair<String, String>>,
    ): Flow<WebNovel> {
        val filters = mutableListOf<Bson>(
            exists(WebNovel::toc.field() + ".0"),
        )
        val nsfwFilter = or(
            eq(WebNovel::attentions.field(), WebNovelAttention.R18),
            eq(WebNovel::attentions.field(), WebNovelAttention.性描写),
        )
        when (r18) {
            WebNovelTaskR18.Exclude -> filters.add(nor(nsfwFilter))
            WebNovelTaskR18.Only -> filters.add(nsfwFilter)
            WebNovelTaskR18.Include -> Unit
        }
        if (excludedNovelIds.isNotEmpty()) {
            filters.add(
                nor(*excludedNovelIds.map { (providerId, novelId) ->
                    WebNovel.byId(providerId, novelId)
                }.toTypedArray())
            )
        }

        val primarySort = when (sort) {
            WebNovelTaskSort.UpdatedAt -> descending(WebNovel::updateAt.field())
            WebNovelTaskSort.Views -> descending(WebNovel::visited.field())
        }
        return collection
            .find(and(filters))
            .sort(orderBy(primarySort, ascending(WebNovel::id.field())))
    }
}
