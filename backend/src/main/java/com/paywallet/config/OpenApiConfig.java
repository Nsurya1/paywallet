package com.paywallet.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI payWalletOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("PayWallet API")
                        .description("High-throughput, Concurrency-Safe Digital Wallet Ledger Engine")
                        .version("v1.0.0")
                        .contact(new Contact().name("PayWallet Team"))
                        .license(new License().name("Apache 2.0")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter JWT Bearer token")));
    }
}
