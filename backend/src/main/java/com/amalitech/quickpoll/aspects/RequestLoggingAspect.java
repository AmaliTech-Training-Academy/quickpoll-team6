package com.amalitech.quickpoll.aspects;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@Slf4j
public class RequestLoggingAspect {

    /**
     * Intercepts every public method in any @RestController and logs
     * the incoming HTTP method + URI before the handler executes.
     */
    @Before("within(@org.springframework.web.bind.annotation.RestController *)")
    public void logIncomingRequest(JoinPoint joinPoint) {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            log.info("[REQUEST] {} {} — handler: {}.{}()",
                    request.getMethod(),
                    request.getRequestURI(),
                    joinPoint.getSignature().getDeclaringType().getSimpleName(),
                    joinPoint.getSignature().getName());
        }
    }
}
