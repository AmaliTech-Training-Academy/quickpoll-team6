package com.amalitech.quickpoll.errorhandlers;

public class AlreadyVotedException extends RuntimeException{
    public AlreadyVotedException(String message) {
        super(message);
    }
}
