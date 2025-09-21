package util.epub

import com.google.common.jimfs.Configuration
import com.google.common.jimfs.Jimfs
import org.slf4j.LoggerFactory
import java.nio.file.FileSystem
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path


fun FileSystem.zipGetPath(path: String): Path {
    return if (!path.startsWith("/")) {
        getPath(Path.of("/").resolve(path).toString())
    } else {
        getPath(path)
    }
}

object ZipUtils {
    val logger = LoggerFactory.getLogger(ZipUtils::class.java)

    const val MAX_ALLOWED_EPUB_SIZE = 50 * 1024 * 1024  // 50MiB

    /**
     * @param zipPath epub/zip 文件路径
     */
    inline fun use(zipPath: Path, block: (FileSystem) -> Unit) {
        val unzipMethods = listOf(ZipUtils::unzipByJDK, ZipUtils::unzipByZip4J)
        for (method in unzipMethods) {
            try {
                method(zipPath).use(block)
                return
            } catch (e: Exception) {
                logger.warn("Failed to unzip $zipPath with ${method.name}.", e)
            }
        }
        throw Exception("Failed to unzip $zipPath.")
    }

    // Consider moving the unzipByXXX methods to a separate class and make them reusable.
    fun unzipByZip4J(zipPath: Path): FileSystem {
        val fs = Jimfs.newFileSystem(Configuration.unix())
        var decSize = 0
        Files.newInputStream(zipPath).use { inputStream ->
            net.lingala.zip4j.io.inputstream.ZipInputStream(inputStream).use { zipInputStream ->
                generateSequence { zipInputStream.nextEntry }.forEach { localFileHeader ->
                    var readLen: Int
                    val readBuffer = ByteArray(4096)

                    val extractedFile = Path.of("/").resolve(localFileHeader.fileName)
                    val extractedFilePath = fs.getPath(extractedFile.toString())
                    if (localFileHeader.isDirectory) {
                        Files.createDirectories(extractedFilePath)
                    } else {
                        // NOTE(kuriko): 以防万一 zip iter 顺序并非目录在前。
                        Files.createDirectories(extractedFilePath.parent ?: fs.getPath("/"))
                        Files.newOutputStream(extractedFilePath).use { outputStream ->
                            while ((zipInputStream.read(readBuffer).also { readLen = it }) > 0) {
                                outputStream.write(readBuffer, 0, readLen)
                                decSize += readLen
                                if (decSize > MAX_ALLOWED_EPUB_SIZE) {
                                    throw IllegalStateException("Decompressed epub size exceeds the limit.")
                                }
                            }
                        }
                    }
                }
            }
        }
        return fs
    }

    fun unzipByJDK(zipPath: Path): FileSystem {
        return FileSystems.newFileSystem(zipPath)
    }
}

