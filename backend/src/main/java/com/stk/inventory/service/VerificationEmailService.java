package com.stk.inventory.service;

import com.stk.inventory.entity.User;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VerificationEmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String mailFrom;
    private final String frontendBaseUrl;

    public VerificationEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.from:}") String mailFrom,
            @Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailFrom = mailFrom;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public void sendSignupVerification(User user) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || mailFrom == null || mailFrom.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "메일 발송 설정이 필요합니다.");
        }

        String verificationUrl = frontendBaseUrl.replaceAll("/+$", "") + "/verify-email?token=" + user.getEmailVerificationToken();

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("[STK-ENG] 이메일 인증을 완료해주세요");
        message.setText(
                "STK-ENG 회원가입을 완료하려면 아래 링크를 열어 이메일 인증을 진행해주세요.\n\n"
                        + verificationUrl
                        + "\n\n"
                        + "링크가 만료되었다면 같은 이메일로 다시 회원가입을 진행하면 새 링크를 받을 수 있습니다."
        );

        try {
            mailSender.send(message);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "인증 메일을 보내지 못했습니다. 메일 설정을 확인해주세요.");
        }
    }
}
