package util

import io.kotest.core.spec.style.DescribeSpec
import util.epub.ZipUtils
import java.nio.file.Files
import kotlin.io.path.Path
import kotlin.io.path.listDirectoryEntries
import kotlin.io.path.name

class EpubZipTest : DescribeSpec({
    describe("ZipUtils") {
        it("processing all EPUB files in the 'resources/util' directory") {
            val epubFiles = Path("data/files-test").listDirectoryEntries()
            epubFiles.forEach { epubPath ->
                ZipUtils.unzip(epubPath).use { fs ->
                    val root = fs.rootDirectories.first()
                    println("Checking epub: ${epubPath.name}")
                    println("Root directory inside epub: $root")
                    Files.walk(root).forEach { path ->
                        println("${epubPath.name}: $path")
                    }
                }
            }
        }
    }
})
