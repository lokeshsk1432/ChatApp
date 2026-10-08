package com.substring.chat.entities;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Message {

    private String id;
    private String sender;
    private String content;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private Instant timeStamp;

    private MessageReply replyTo;

    public Message(String sender, String content) {
        this.id = UUID.randomUUID().toString();
        this.sender = sender;
        this.content = content;
        this.timeStamp = Instant.now();
    }
}
