package com.amalitech.quickpoll.errorhandlers;

public class PollAlreadyClosedException extends RuntimeException {
    public PollAlreadyClosedException(String message) {
        super(message);
    }
}
