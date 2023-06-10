package infra.web

import infra.model.NovelFileLang
import infra.model.WebNovelChapter
import infra.model.WebNovelMetadata
import infra.model.WebNovelTocItem
import util.epub.EpubBook
import util.epub.Navigation
import util.epub.createEpubXhtml
import java.nio.file.Path

private const val MISSING_EPISODE_HINT = "该章节缺失。"

suspend fun makeEpubFile(
    filePath: Path,
    lang: NovelFileLang,
    metadata: WebNovelMetadata,
    chapters: Map<String, WebNovelChapter>,
) {
    val epub = EpubBook()
    val identifier = "${metadata.providerId}.${metadata.novelId}"
    epub.addIdentifier(identifier, true)

    when (lang) {
        NovelFileLang.JP -> {
            epub.addTitle(metadata.titleJp)
            epub.addLanguage("jp")
            epub.addDescription(metadata.introductionJp)
            epub.addNavigation(
                identifier,
                Navigation(
                    language = "jp",
                    title = metadata.titleJp,
                    items = tocToNavigationItems(metadata.toc) { it.titleJp }
                )
            )
        }

        else -> {
            epub.addTitle(metadata.titleZh ?: metadata.titleJp)
            epub.addLanguage("zh")
            epub.addDescription(metadata.introductionZh ?: "")
            epub.addNavigation(
                identifier,
                Navigation(
                    language = "zh",
                    title = metadata.titleZh ?: metadata.titleJp,
                    items = tocToNavigationItems(metadata.toc) { it.titleZh ?: it.titleJp }
                )
            )
        }
    }
    metadata.authors.map {
        epub.addCreator(it.name)
    }


    metadata.toc.filter { it.chapterId != null }.forEachIndexed { index, token ->
        val id = "episode${index + 1}.xhtml"
        val path = "Text/$id"
        val chapter = chapters[token.chapterId]

        val resource = when (lang) {
            NovelFileLang.JP -> createEpubXhtml(path, id, "jp", token.titleJp) {
                it.appendElement("h1").appendText(token.titleJp)
                if (chapter == null) {
                    it.appendElement("p").appendText(MISSING_EPISODE_HINT)
                } else {
                    chapter.paragraphs.forEach { text ->
                        it.appendElement("p").appendText(text)
                    }
                }
            }

            NovelFileLang.ZH_BAIDU, NovelFileLang.ZH_YOUDAO -> createEpubXhtml(
                path,
                id,
                "zh",
                token.titleZh ?: token.titleJp
            ) {
                it.appendElement("h1").appendText(token.titleZh ?: token.titleJp)
                val paragraphs = if (lang == NovelFileLang.ZH_BAIDU) {
                    chapter?.baiduParagraphs
                } else {
                    chapter?.youdaoParagraphs
                }
                if (paragraphs == null) {
                    it.appendElement("p").appendText(MISSING_EPISODE_HINT)
                } else {
                    paragraphs.forEach { text ->
                        it.appendElement("p").appendText(text)
                    }
                }
            }

            NovelFileLang.MIX_BAIDU, NovelFileLang.MIX_YOUDAO -> createEpubXhtml(
                path,
                id,
                "zh",
                token.titleZh ?: token.titleJp
            ) {
                if (token.titleZh == null) {
                    it.appendElement("h1").appendText(token.titleJp)
                } else {
                    it.appendElement("h1").appendText(token.titleZh)
                    it.appendElement("p").appendText(token.titleJp)
                        .attr("style", "opacity:0.4;")
                }
                val paragraphs = if (lang == NovelFileLang.MIX_BAIDU) {
                    chapter?.baiduParagraphs
                } else {
                    chapter?.youdaoParagraphs
                }
                if (chapter == null || paragraphs == null) {
                    it.appendElement("p").appendText(MISSING_EPISODE_HINT)
                } else {
                    paragraphs.zip(chapter.paragraphs).forEach { (textZh, textJp) ->
                        if (textJp.isBlank()) {
                            it.appendElement("p").appendText(textJp)
                        } else {
                            it.appendElement("p").appendText(textZh.trimEnd())
                            it.appendElement("p").appendText(textJp.trimStart())
                                .attr("style", "opacity:0.4;")
                        }
                    }
                }
            }

            NovelFileLang.MIX_ALL -> createEpubXhtml(
                path,
                id,
                "zh",
                token.titleZh ?: token.titleJp
            ) {
                if (token.titleZh == null) {
                    it.appendElement("h1").appendText(token.titleJp)
                } else {
                    it.appendElement("h1").appendText(token.titleZh)
                    it.appendElement("p").appendText(token.titleJp)
                        .attr("style", "opacity:0.4;")
                }
                if (chapter?.baiduParagraphs == null || chapter.youdaoParagraphs == null) {
                    it.appendElement("p").appendText(MISSING_EPISODE_HINT)
                } else {
                    for (i in chapter.paragraphs.indices) {
                        val textJp = chapter.paragraphs[i]
                        if (textJp.isBlank()) {
                            it.appendElement("p").appendText(textJp)
                        } else {
                            it.appendElement("p").appendText(chapter.youdaoParagraphs[i])
                            it.appendElement("p").appendText(chapter.baiduParagraphs[i])
                            it.appendElement("p").appendText(textJp)
                                .attr("style", "opacity:0.4;")
                        }
                    }
                }
            }
        }
        epub.addResource(resource, true)
    }
    epub.write(filePath)
}

private fun tocToNavigationItems(
    toc: List<WebNovelTocItem>,
    title: (WebNovelTocItem) -> String
): List<Navigation.Item> {
    var index = 0
    return toc.map {
        if (it.chapterId != null) {
            index += 1
            Navigation.Item("episode$index.xhtml", title(it))
        } else {
            Navigation.Item(null, title(it))
        }
    }
}
