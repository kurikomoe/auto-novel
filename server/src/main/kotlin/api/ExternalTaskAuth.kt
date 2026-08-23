package api

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.auth0.jwt.exceptions.JWTVerificationException
import io.ktor.http.HttpStatusCode
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Date
import java.util.UUID

data class ExternalCredential(
    val fingerprint: String,
)

data class VerifiedTaskToken(
    val id: String,
    val credentialFingerprint: String,
)

class ExternalTaskAuth(
    private val apiKey: String,
    taskTokenSecret: String,
) {
    private val tokenSecret = taskTokenSecret
    private val issuer = "auto-novel-external-task"
    private val algorithm by lazy { Algorithm.HMAC256(tokenSecret) }
    private val verifier by lazy {
        JWT.require(algorithm)
            .withIssuer(issuer)
            .build()
    }

    private fun requireConfigured() {
        if (apiKey.isBlank() || tokenSecret.isBlank()) {
            throw HttpException(
                HttpStatusCode.ServiceUnavailable,
                "外部任务 API 尚未配置",
            )
        }
    }

    fun authenticate(authorizationHeader: String?): ExternalCredential {
        requireConfigured()
        val prefix = "Bearer "
        val supplied = authorizationHeader
            ?.takeIf { it.startsWith(prefix) }
            ?.substring(prefix.length)
            ?: throwUnauthorized("API Key 不合法")
        val expectedBytes = apiKey.toByteArray(StandardCharsets.UTF_8)
        val suppliedBytes = supplied.toByteArray(StandardCharsets.UTF_8)
        if (!MessageDigest.isEqual(expectedBytes, suppliedBytes)) {
            throwUnauthorized("API Key 不合法")
        }
        return ExternalCredential(fingerprint(apiKey))
    }

    fun issueTaskToken(
        providerId: String,
        novelId: String,
        contentRevision: Long,
        credential: ExternalCredential,
    ): String {
        requireConfigured()
        return JWT.create()
            .withIssuer(issuer)
            .withJWTId(UUID.randomUUID().toString())
            .withIssuedAt(Date())
            .withClaim("providerId", providerId)
            .withClaim("novelId", novelId)
            .withClaim("contentRevision", contentRevision)
            .withClaim("credential", credential.fingerprint)
            .sign(algorithm)
    }

    fun verifyTaskToken(
        token: String?,
        providerId: String,
        novelId: String,
        contentRevision: Long,
        credential: ExternalCredential,
    ): VerifiedTaskToken {
        requireConfigured()
        val decoded = try {
            verifier.verify(token ?: throwUnauthorized("缺少 task token"))
        } catch (_: JWTVerificationException) {
            throwUnauthorized("task token 不合法")
        }
        if (
            decoded.getClaim("providerId").asString() != providerId ||
            decoded.getClaim("novelId").asString() != novelId ||
            decoded.getClaim("credential").asString() != credential.fingerprint
        ) {
            throwUnauthorized("task token 与当前任务不匹配")
        }
        if (decoded.getClaim("contentRevision").asLong() != contentRevision) {
            throwConflict("TASK_SNAPSHOT_STALE: 小说已更新，请重新获取任务")
        }
        return VerifiedTaskToken(
            id = decoded.id ?: throwUnauthorized("task token 不合法"),
            credentialFingerprint = credential.fingerprint,
        )
    }

    companion object {
        fun fingerprint(value: String): String = MessageDigest
            .getInstance("SHA-256")
            .digest(value.toByteArray(StandardCharsets.UTF_8))
            .joinToString("") { byte ->
                (byte.toInt() and 0xff).toString(16).padStart(2, '0')
            }
    }
}
