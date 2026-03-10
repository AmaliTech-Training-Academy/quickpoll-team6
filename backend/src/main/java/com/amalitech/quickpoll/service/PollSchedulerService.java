package com.amalitech.quickpoll.service;

import com.amalitech.quickpoll.event.PollClosedDomainEvent;
import com.amalitech.quickpoll.model.Poll;
import com.amalitech.quickpoll.repository.PollRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PollSchedulerService {
    private final PollRepository pollRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void closeExpiredPolls() {
        LocalDateTime now = LocalDateTime.now();
        List<Poll> expiredPolls = pollRepository.findExpiredActivePolls(now);
        
        for (Poll poll : expiredPolls) {
            poll.setActive(false);
            pollRepository.save(poll);
            eventPublisher.publishEvent(new PollClosedDomainEvent(poll));
            log.info("Closed expired poll_id={}", poll.getId());
        }
        
        if (!expiredPolls.isEmpty()) {
            log.info("Closed {} expired polls", expiredPolls.size());
        }
    }
}
